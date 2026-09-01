// protocol.h — CodWeb 権威サーバー実証用のネットワークプロトコル定義
//
// これは「WebTransport の unreliable datagram（= UDP 相当）」の通信パターンを、
// C++ の素の UDP ソケットで再現した最小限の実証用ヘッダです。
//
// !!! 位置づけ（重要）!!!
// ・本物の WebTransport (HTTP/3 + QUIC) ではありません。このサンドボックスでは
//   cmake / OpenSSLヘッダ / autotools が無く、QUIC スタックをビルドできないため、
//   その代替として「UDP ソケット + 手組みバイナリプロトコル」で送受信を実証します。
// ・ここで試すのは「プレイヤーデータを 1 送出単位で送り、ロスしても次フレームで
//   上書きする（unreliable/unordered, latest-state-wins）」という WebTransport
//   datagram の中心思想です。
//
// 実物の WebTransport に置き換える場合、この「プロトコル層」はそのまま、
// 下位の「トランスポート層」を QUIC/WebTransport に差し替えるだけです。
//
// 設計方針（重要）:
//   構造体のメモリ上のパディングに依存せず、**明示的なバイト列へのシリアライズ**で
//   ワイヤーレイアウトを固定する。これによりコンパイラ・プラットフォーム・エンディアン
//   に依存せず、将来の WebTransport / 他言語クライアントと相互運用できる。

#pragma once

#include <cstdint>
#include <cstddef>
#include <cstring>
#include <string>
#include <vector>

namespace wt_udp {

// ---- プロトコル識別子 & バージョン ----
static constexpr uint32_t kMagic      = 0x434F4457u; // "CODW"
static constexpr uint16_t kVersion    = 1;
static constexpr uint16_t kMaxPlayers = 32;
static constexpr size_t   kMaxNameLen = 32;
static constexpr size_t   kMaxPlayersPkt = kMaxPlayers; // Snapshot に載せる人数上限
static constexpr size_t   kMaxPacketSize = 1500;        // 1 データグラム上限（MTU 目安）

// ---- パケット種別（WebTransport の datagram に相当。単方向・各パケット自己完結）----
enum class MsgType : uint8_t {
    PlayerState = 1,   // クライアント -> サーバー: 自分の状態（毎フレーム）
    Snapshot    = 2,   // サーバー -> クライアント: 他プレイヤーの状態群
    Hello       = 3,   // クライアント -> サーバー: 入室
    Bye         = 4,   // クライアント -> サーバー: 退室
};

// ---- PlayerData: 逐次更新される「最新状態」 ----
// ワイヤー上は固定レイアウト（後述の WritePlayer/ReadPlayer）。アプリ側では
// 意味のある単位として扱う。name は可変長（ワイヤーでは固定 32 バイト + 長さ）。
struct PlayerData {
    float x, y, z;        // 位置（ワールド座標）
    float yaw, pitch;     // 視点（ラジアン）
    float vx, vy;         // 移動入力（正規化、-1..1）
    uint8_t isShooting;   // 1bit 相当（0/1）— WebTransport 設計方針の isShooting フラグ
    uint8_t isMoving;     // 0/1
    uint8_t team;         // チーム（0/1）
    uint8_t pad;          // 予約
    uint32_t seq;         // シーケンス番号（ロス検出・最新のみ処理）
    int32_t  playerId;    // 送信者 ID
    std::string name;     // 表示名
};

// ---- ワイヤーレイアウト（big-endian, 固定長） ----
// 1 Player 分 = 7*4(float) + 4(uint8) + 4(uint32 seq) + 4(int32 id) + 1(len) + name
//   = 28 + 4 + 4 + 4 + 1 + 32 = 73 バイト
static constexpr size_t kWirePlayerSize = 73;

// ビッグエンディアンで読み書きするためのヘルパー
inline void putU32(uint8_t* p, uint32_t v) {
    p[0] = (v >> 24) & 0xFF; p[1] = (v >> 16) & 0xFF;
    p[2] = (v >>  8) & 0xFF; p[3] = (v      ) & 0xFF;
}
inline uint32_t getU32(const uint8_t* p) {
    return (uint32_t(p[0]) << 24) | (uint32_t(p[1]) << 16) | (uint32_t(p[2]) << 8) | uint32_t(p[3]);
}
inline void putF32(uint8_t* p, float f) { uint32_t u; std::memcpy(&u, &f, 4); putU32(p, u); }
inline float getF32(const uint8_t* p)   { uint32_t u = getU32(p); float f; std::memcpy(&f, &u, 4); return f; }

// 1 プレイヤーをバイト列に書き出す（先頭に 73 バイトを書き、長さを返す）
inline size_t writePlayer(uint8_t* dst, const PlayerData& in) {
    size_t o = 0;
    putF32(dst + o, in.x); o += 4;
    putF32(dst + o, in.y); o += 4;
    putF32(dst + o, in.z); o += 4;
    putF32(dst + o, in.yaw); o += 4;
    putF32(dst + o, in.pitch); o += 4;
    putF32(dst + o, in.vx); o += 4;
    putF32(dst + o, in.vy); o += 4;
    dst[o++] = in.isShooting ? 1 : 0;
    dst[o++] = in.isMoving   ? 1 : 0;
    dst[o++] = in.team;
    dst[o++] = 0;                         // pad
    putU32(dst + o, in.seq); o += 4;
    // playerId (int32) を uint32 として格納
    putU32(dst + o, static_cast<uint32_t>(in.playerId)); o += 4;
    // name: 長さ(1) + データ。固定長フィールドは kMaxNameLen(32) バイトを占める
    size_t nlen = in.name.size();
    if (nlen > kMaxNameLen) nlen = kMaxNameLen;
    dst[o++] = static_cast<uint8_t>(nlen);
    if (nlen > 0) std::memcpy(dst + o, in.name.data(), nlen);
    o += kMaxNameLen;                     // 固定 32 バイト（残りはゼロ埋め前提）
    return o;
}

// バイト列を PlayerData に読み込む
inline void readPlayer(const uint8_t* src, PlayerData& out) {
    size_t o = 0;
    out.x      = getF32(src + o); o += 4;
    out.y      = getF32(src + o); o += 4;
    out.z      = getF32(src + o); o += 4;
    out.yaw    = getF32(src + o); o += 4;
    out.pitch  = getF32(src + o); o += 4;
    out.vx     = getF32(src + o); o += 4;
    out.vy     = getF32(src + o); o += 4;
    out.isShooting = src[o++] != 0;
    out.isMoving   = src[o++] != 0;
    out.team       = src[o++];
    o++;                                  // pad
    out.seq      = getU32(src + o); o += 4;
    out.playerId = static_cast<int32_t>(getU32(src + o)); o += 4;
    uint8_t nlen = src[o++];
    if (nlen > kMaxNameLen) nlen = static_cast<uint8_t>(kMaxNameLen);
    out.name.assign(reinterpret_cast<const char*>(src + o), nlen);
}

// ---- パケット（UDP データグラム = WebTransport datagram 相当）----
// ワイヤー: [magic:4][version:2][type:1][reserved:1] + ペイロード
//   ペイロード:
//     PlayerState / Hello : 1 Player (73B)
//     Snapshot            : [count:1] + count * Player(73B)
static constexpr size_t kHeaderSize = 8;

// 1 人分のプレイヤーをパケットへ書き込み、全体長さを返す
inline size_t buildPacket(uint8_t* buf, size_t capacity, MsgType type, const PlayerData* p, int playerCount) {
    if (capacity < kHeaderSize) return 0;
    putU32(buf, kMagic);
    buf[4] = static_cast<uint8_t>((kVersion >> 8) & 0xFF);
    buf[5] = static_cast<uint8_t>(kVersion & 0xFF);
    buf[6] = static_cast<uint8_t>(type);
    buf[7] = 0; // reserved

    size_t o = kHeaderSize;
    if (type == MsgType::Snapshot) {
        buf[o++] = static_cast<uint8_t>(playerCount);
        for (int i = 0; i < playerCount; ++i) {
            if (o + kWirePlayerSize > capacity) return 0;
            writePlayer(buf + o, p[i]);
            o += kWirePlayerSize;
        }
    } else {
        if (o + kWirePlayerSize > capacity) return 0;
        writePlayer(buf + o, *p);
        o += kWirePlayerSize;
    }
    return o;
}

// パケットを解析（受信側）。type / プレイヤー数 / コールバックを提供。
struct ParsedPacket {
    uint32_t magic = 0;
    uint16_t version = 0;
    uint8_t  type = 0;
    const uint8_t* payload = nullptr;
    size_t   payloadLen = 0;
    int      playerCount = 0;             // Snapshot 用
    PlayerData player;                    // 1 人用
    std::vector<PlayerData> players;      // Snapshot 用
};

} // namespace wt_udp
