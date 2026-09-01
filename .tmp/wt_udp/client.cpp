// client.cpp — CodWeb クライアント（UDP 実証、ブラウザの代替）
//
// ブラウザで動く本来のクライアント(JS/TS)は WebTransport API を使いますが、このサンドボックスでは
// ブラウザを開けないため、同じ「PlayerData を毎フレーム送り、Snapshot を受ける」挙動を
// C++ の UDP クライアントで再現します。メッセージレイアウト・ロジックはブラウザ側と共通です。
//
// ・--name / --port / --team などを引数で指定
// ・WASD で移動、SPACE で射撃（isShooting フラグ）—— 実物 WebTransport 方針の isShooting を反映
// ・固定ティック（デフォルト 60Hz）で PlayerState を送信
// ・サーバーから Snapshot を受けたら他プレイヤーとして描画（ここではテキスト表示）
//
// ビルド: make          実行: ./wt_client --name Alice --port 9000
//
// !!! 端末制御について !!!
// このクライアントは stdin を non-blocking にし、WASD/SPACE を個別キーで読むため、
// 「単一のクライアントをフォアグラウンドで動かす」用途向けです。2 台同時デモは
// サーバー側で OK ですが、2 つのクライアントを同一端末で同時に動かすとキーが衝突します。
// その場合は片方を `--demo` モード（自動移動）にできます。

#include "protocol.h"
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#include <termios.h>
#include <fcntl.h>
#include <chrono>
#include <thread>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <string>
#include <cmath>

using namespace wt_udp;
using SteadyClock = std::chrono::steady_clock;

static constexpr int kTickHz = 60;
static constexpr float kSpeed = 6.0f;          // m/s
static constexpr float kTurnYaw = 1.2f;        // rad/s
static constexpr float kTurnPitch = 0.8f;

int g_fd = -1;               // stdin non-blocking 用

bool readKey(char &c) {
    char b;
    ssize_t n = ::read(g_fd, &b, 1);
    if (n == 1) { c = b; return true; }
    return false;
}

int main(int argc, char** argv) {
    std::string name = "Player";
    int port = 9000;
    int team = 0;
    int playerId = 1;
    bool demo = false;        // 自動移動（キー入力不要）モード
    double runtimeS = 0.0;    // >0 なら一定時間で自動終了（デモ用）

    for (int i = 1; i < argc; ++i) {
        std::string a = argv[i];
        auto val = [&](int idx) -> std::string { return (i + idx < argc) ? argv[i + idx] : ""; };
        if (a == "--name")    { name = val(1); ++i; }
        else if (a == "--port")  { port = std::atoi(val(1).c_str()); ++i; }
        else if (a == "--team")  { team = std::atoi(val(1).c_str()); ++i; }
        else if (a == "--id")    { playerId = std::atoi(val(1).c_str()); ++i; }
        else if (a == "--demo")  { demo = true; }
        else if (a == "--runtime") { runtimeS = std::atof(val(1).c_str()); ++i; }
    }

    // stdin を non-blocking に（キー入力を毎フレームポーリング）
    // demo モードではキー入力を使わないのでそのまま。
    termios oldT{};
    if (!demo) {
        tcgetattr(STDIN_FILENO, &oldT);
        termios raw = oldT;
        raw.c_lflag &= ~(ICANON | ECHO);
        raw.c_cc[VMIN] = 0; raw.c_cc[VTIME] = 0;
        tcsetattr(STDIN_FILENO, TCSANOW, &raw);
        g_fd = STDIN_FILENO;
        int fl = fcntl(STDIN_FILENO, F_GETFL, 0);
        fcntl(STDIN_FILENO, F_SETFL, fl | O_NONBLOCK);
    }

    // socket
    int sock = ::socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) { perror("socket"); return 1; }
    // ループを一定周期で回すため非ブロッキングにする（recvfrom がブロックしないように）
    int sockFlags = fcntl(sock, F_GETFL, 0);
    fcntl(sock, F_SETFL, sockFlags | O_NONBLOCK);

    sockaddr_in server{};
    server.sin_family = AF_INET;
    server.sin_port   = htons(port);
    inet_pton(AF_INET, "127.0.0.1", &server.sin_addr);

    std::printf("[client] %s (id=%d team=%d) -> 127.0.0.1:%d\n", name.c_str(), playerId, team, port);

    // 状態の初期化（PlayerData は std::string を含むため memset は避けて値初期化）
    PlayerData st{};
    st.x = (playerId == 1) ? -5.0f : 5.0f;
    st.z = 0.0f;
    st.name = name;
    st.team = (uint8_t)team;
    st.playerId = playerId;

    auto sendMsg = [&](MsgType type, const PlayerData* pd, int count) {
        uint8_t pkt[kMaxPacketSize];
        size_t sz = buildPacket(pkt, sizeof(pkt), type, pd, count);
        if (sz > 0)
            ::sendto(sock, pkt, sz, 0, reinterpret_cast<sockaddr*>(&server), sizeof(server));
        return sz;
    };

    // Hello（入室）
    {
        sendMsg(MsgType::Hello, &st, 1);
        std::printf("[client] 入室 (Hello)\n");
    }

    auto start = SteadyClock::now();
    unsigned long tick = 0;
    bool running = true;

    while (running) {
        auto now = SteadyClock::now();
        double dt = std::chrono::duration<double>(now - start).count();
        auto target = static_cast<unsigned long>(dt * kTickHz);

        if (target <= tick) {
            // まだ次のティックでない → 受信だけポーリング（ノンブロッキング）
        }

        // ---- 入力 ----
        float forward = 0, strafe = 0;
        bool shooting = false;

        if (demo) {
            // デモ: 時間で動きを変化させ、自動で前進/旋回/射撃を行う
            double t = std::chrono::duration<double>(now - start).count();
            forward = (std::sin(t * 0.7) > -0.1) ? 1.0f : -1.0f;   // 前後
            strafe  = std::cos(t * 0.9);                           // 左右
            st.yaw  = static_cast<float>(t * 0.4);                 // 旋回
            shooting = (std::fmod(t, 1.5) < 0.5);                  // 定期的に射撃
        } else {
            char c;
            while (readKey(c)) {
                switch (c) {
                    case 'w': case 'W': forward = 1.0f; break;
                    case 's': case 'S': forward = -1.0f; break;
                    case 'a': case 'A': strafe = -1.0f; break;
                    case 'd': case 'D': strafe = 1.0f; break;
                    case ' ': shooting = true; break;
                    case 'q': case 'Q': running = false; break;
                    default: break;
                }
            }
        }
        st.isMoving = (forward != 0 || strafe != 0);
        st.isShooting = shooting ? 1 : 0;

        // ---- 移動（yaw 方向基準の簡易移動、視点はキーで回転）----
        st.vx = strafe; st.vy = forward;
        float cosA = std::cos(st.yaw), sinA = std::sin(st.yaw);
        st.x += (forward * sinA + strafe * cosA) * kSpeed * (1.0f / kTickHz);
        st.z += (forward * cosA - strafe * sinA) * kSpeed * (1.0f / kTickHz);

        // ---- ティックごとに送信 ----
        if (target > tick) {
            tick = target;
            st.seq++;
            sendMsg(MsgType::PlayerState, &st, 1);
        }

        // ---- 指定時間で自動終了（デモ用）----
        if (runtimeS > 0.0 && dt >= runtimeS) {
            running = false;
        }

        // ---- 受信（Snapshot）----
        uint8_t buf[kMaxPacketSize];
        while (true) {
            sockaddr_in from{};
            socklen_t flen = sizeof(from);
            ssize_t n = ::recvfrom(sock, buf, sizeof(buf), 0,
                                   reinterpret_cast<sockaddr*>(&from), &flen);
            if (n <= 0) break;
            if (static_cast<size_t>(n) < kHeaderSize) break;
            uint32_t magic = getU32(buf);
            uint16_t version = static_cast<uint16_t>((buf[4] << 8) | buf[5]);
            uint8_t  type   = buf[6];
            if (magic != kMagic || version != kVersion) continue;
            if (static_cast<MsgType>(type) == MsgType::Snapshot) {
                size_t off = kHeaderSize;
                uint8_t cnt = buf[off++];
                // 簡易テキスト描画: 1 行に他プレイヤー
                std::printf("\r[client] tick=%lu seq=%u  pos=(%.2f,%.2f,%.2f) shoot=%d | 他プレイヤー %u 名: ",
                            tick, st.seq, st.x, st.y, st.z, st.isShooting, cnt);
                for (int i = 0; i < cnt; ++i) {
                    if (off + kWirePlayerSize > (size_t)n) break;
                    PlayerData w;
                    readPlayer(buf + off, w); off += kWirePlayerSize;
                    std::printf("[%s (%.2f,%.2f,%.2f) s=%d]", w.name.c_str(), w.x, w.y, w.z, w.isShooting);
                }
                std::fflush(stdout);
            }
        }

        // 約 1/60 秒待つ
        std::this_thread::sleep_for(std::chrono::milliseconds(1000 / kTickHz - 1));
    }

    // Bye
    {
        sendMsg(MsgType::Bye, &st, 1);
    }

    if (!demo) {
        tcsetattr(STDIN_FILENO, TCSANOW, &oldT);
    }
    ::close(sock);
    std::printf("\n[client] 退室\n");
    return 0;
}
