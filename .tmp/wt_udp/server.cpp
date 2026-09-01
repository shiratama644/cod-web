// server.cpp — CodWeb 権威ゲームサーバー（UDP 実証）
//
// 「構成 A: C++ が権威ゲームサーバー」の最小骨格。
// ・各クライアントから PlayerState（unreliable datagram 相当）を受信して最新状態を保持
// ・他クライアントへ Snapshot（最新状態群）をブロードキャスト
// ・ロスしても「最新状態で上書き」するので、古いパケットは無視する（latest-state-wins）
// ・タイムアウトで離脱扱い
//
// 実物の WebTransport にする場合は、この受信/送信ループの socket 授受を
// QUIC/WebTransport セッションに置き換えるだけです（プロトコル層 isShooting 等は共通）。
//
// ビルド: make          実行: ./bin/wt_server

#include "protocol.h"
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <map>
#include <vector>
#include <string>

using namespace wt_udp;
using SteadyClock = std::chrono::steady_clock;

static constexpr int       kPort     = 9000;
static constexpr int       kMaxBuf   = kMaxPacketSize;
static constexpr long long kTimeoutS = 5;  // 5 秒無応答で離脱

struct Client {
    bool       alive = false;
    sockaddr_in addr{};
    PlayerData state;
    SteadyClock::time_point lastSeen;
    uint32_t   lastSeq = 0;
};

int main() {
    int sock = ::socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) { perror("socket"); return 1; }

    int reuse = 1;
    ::setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    sockaddr_in bindAddr{};
    bindAddr.sin_family      = AF_INET;
    bindAddr.sin_addr.s_addr = htonl(INADDR_ANY);
    bindAddr.sin_port        = htons(kPort);

    if (::bind(sock, reinterpret_cast<sockaddr*>(&bindAddr), sizeof(bindAddr)) < 0) {
        perror("bind"); return 1;
    }
    std::printf("[server] UDP 権威サーバー起動 0.0.0.0:%d\n", kPort);
    std::printf("[server] WebTransport(datagram) 相当の PlayerData を最新状態で保持・ブロードキャスト中\n");

    std::map<std::string, Client> clients;  // key = "ip:port"

    uint8_t buf[kMaxBuf];
    while (true) {
        sockaddr_in from{};
        socklen_t fromLen = sizeof(from);
        ssize_t n = ::recvfrom(sock, buf, sizeof(buf), 0,
                               reinterpret_cast<sockaddr*>(&from), &fromLen);
        if (n < 0) { if (errno == EINTR) continue; perror("recvfrom"); continue; }

        // ---- パケット解析 ----
        if (static_cast<size_t>(n) < kHeaderSize) continue;
        uint32_t magic = getU32(buf);
        uint16_t version = static_cast<uint16_t>((buf[4] << 8) | buf[5]);
        uint8_t  type   = buf[6];

        if (magic != kMagic || version != kVersion) {
            std::printf("[server] 不正パケット（magic/version）: magic=%08X v=%u\n", magic, version);
            continue;
        }

        char ipStr[INET_ADDRSTRLEN] = {0};
        inet_ntop(AF_INET, &from.sin_addr, ipStr, sizeof(ipStr));
        char key[64];
        std::snprintf(key, sizeof(key), "%s:%d", ipStr, ntohs(from.sin_port));
        auto &c = clients[key];

        // ペイロード開始（type に応じて）
        switch (static_cast<MsgType>(type)) {
            case MsgType::PlayerState: {
                if (static_cast<size_t>(n) < kHeaderSize + kWirePlayerSize) break;
                PlayerData pd;
                readPlayer(buf + kHeaderSize, pd);
                if (pd.name.empty()) pd.name = key;

                bool outOfOrder = (pd.seq != 0) && (pd.seq < c.lastSeq);
                c.alive    = true;
                c.addr     = from;
                c.state    = pd;
                c.lastSeen = SteadyClock::now();
                if (outOfOrder) {
                    std::printf("[server] %-16s seq=%u 古いため無視（latest-wins）\n", key, pd.seq);
                } else {
                    c.lastSeq = pd.seq;
                    std::printf("[server] %-16s %-8s pos=(%.2f,%.2f,%.2f) yaw=%.2f shoot=%d seq=%u\n",
                                key, pd.name.c_str(), pd.x, pd.y, pd.z, pd.yaw, pd.isShooting, pd.seq);
                }
                break;
            }
            case MsgType::Hello: {
                c.alive = true; c.addr = from; c.lastSeen = SteadyClock::now();
                if (static_cast<size_t>(n) >= kHeaderSize + kWirePlayerSize) {
                    PlayerData pd; readPlayer(buf + kHeaderSize, pd);
                    c.state = pd;
                    std::printf("[server] Hello  %-16s %s\n", key, pd.name.c_str());
                } else {
                    std::printf("[server] Hello  %-16s\n", key);
                }
                break;
            }
            case MsgType::Bye: {
                std::printf("[server] Bye    %-16s\n", key);
                c.alive = false;
                break;
            }
            default:
                break;
        }

        // ---- タイムアウト処理 ----
        auto now = SteadyClock::now();
        for (auto it = clients.begin(); it != clients.end(); ) {
            auto age = std::chrono::duration_cast<std::chrono::seconds>(now - it->second.lastSeen).count();
            if (!it->second.alive || age > kTimeoutS) {
                std::printf("[server] 離脱: %-16s (%s)\n", it->first.c_str(), age > kTimeoutS ? "timeout" : "bye");
                it = clients.erase(it);
            } else {
                ++it;
            }
        }

        // ---- Snapshot ブロードキャスト: 各生存クライアントへ「他プレイヤー」状態群 ----
        std::vector<std::pair<std::string, Client*>> live;
        for (auto &kv : clients)
            if (kv.second.alive)
                live.push_back({kv.first, &kv.second});

        for (auto &dst : live) {
            std::vector<PlayerData> others;
            for (auto &src : live) {
                if (src.first == dst.first) continue;
                others.push_back(src.second->state);
            }
            if (others.empty()) continue;

            uint8_t pkt[kMaxBuf];
            size_t sz = buildPacket(pkt, sizeof(pkt), MsgType::Snapshot,
                                    others.data(), static_cast<int>(others.size()));
            if (sz == 0) continue;
            ::sendto(sock, pkt, sz, 0,
                     reinterpret_cast<sockaddr*>(&dst.second->addr), sizeof(dst.second->addr));
        }
    }

    ::close(sock);
    return 0;
}
