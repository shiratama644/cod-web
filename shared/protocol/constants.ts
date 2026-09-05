/**
 * ネットワーク・シミュレーションのレートと、パケットのバイナリレイアウトに
 * 関わる定数。クライアント（src/）と権威サーバー（server/）の両方から import
 * される。DOM / React / レンダラーに依存しない純粋な値のみを置く。
 *
 * 設計正本: docs/arch/protocol.md。
 */

// ─────────────────────────────────────────────────────────────────────────
// レート構成（シム tick と送信レートを分離する）
// ─────────────────────────────────────────────────────────────────────────

/** サーバー権威シミュレーションの固定 tick レート（Hz）。 */
export const SIM_TICK_HZ = 60
/** シムの固定ステップ秒数（dt = 1/60s ≈ 16.7ms）。 */
export const SIM_DT = 1 / SIM_TICK_HZ
/** クライアント→サーバーの入力送信レート（Hz）。シム tick と 1:1。 */
export const INPUT_SEND_HZ = 60
/** サーバー→クライアントのスナップショット送信レート（Hz）。 */
export const SNAPSHOT_SEND_HZ = 30
/** スナップショットを何 tick おきに送るか（60/30 = 2 tick に 1 回）。 */
export const SNAPSHOT_SEND_EVERY_TICKS = SIM_TICK_HZ / SNAPSHOT_SEND_HZ
/** 1 フレームで処理する固定ステップの最大数（spiral of death 防止）。 */
export const MAX_STEPS_PER_FRAME = 5

/** リモートプレイヤー補間バッファの遅延（ms）。レンダー時刻を過去にずらす。 */
export const INTERP_DELAY_MS = 100
/** ラグ補償の位置履歴保持時間（ms）。巻き戻し窓は 500ms。判定は後続。 */
export const LAGCOMP_HISTORY_MS = 500

/** 1 ルームの最大人数。 */
export const MAX_PLAYERS = 20

// ─────────────────────────────────────────────────────────────────────────
// パケット種別（全バイナリパケットの先頭 1B）
// ─────────────────────────────────────────────────────────────────────────

/** クライアント→サーバー: 入力パケット（60Hz・非信頼・バイナリ）。 protocol PacketType.Input */
export const MSG_C2S_INPUT = 0x10
/** サーバー→クライアント: スナップショット（30Hz・非信頼・バイナリ）。現行ワイヤ（フェーズ 0 では変えない）。 */
export const MSG_S2C_SNAPSHOT = 2
// 制御メッセージ（welcome / join / leave）は Phase 1 では信頼 WS テキスト JSON。

// ─────────────────────────────────────────────────────────────────────────
// バイナリレイアウトの固定サイズ（byte）
// ─────────────────────────────────────────────────────────────────────────

/** 種別バイト。 */
export const PACKET_TYPE_BYTES = 1

/** 入力パケットの本体サイズ（type 1B を除く）。16B 固定のうち 15B。 */
export const INPUT_BODY_BYTES =
  1 + // reserved:u8
  4 + // seq:u32
  1 + // moveX:i8  -100..100
  1 + // moveZ:i8
  2 + // yaw:u16
  2 + // pitch:i16
  2 + // buttons:u16
  2 //  dtMs:u16
/** 入力パケットの総サイズ（type 込み）。 */
export const INPUT_PACKET_BYTES = PACKET_TYPE_BYTES + INPUT_BODY_BYTES

/** スナップショットのヘッダサイズ（type 1B を除く）: serverTick:u32 + lastAckSeq:u32。 */
export const SNAPSHOT_HEADER_BYTES = 4 + 4
/** スナップショットのプレイヤー 1 人あたりサイズ。 */
export const SNAPSHOT_PLAYER_BYTES =
  2 + // id:u16
  6 + // x,y,z:int16 ×3（0.01m 固定小数点）
  6 + // vx,vy,vz:int16 ×3
  2 //  yaw:u16

// ─────────────────────────────────────────────────────────────────────────
// 量子化スケール
// ─────────────────────────────────────────────────────────────────────────

/** 位置: 0.01m 単位（int16。原点 ±327.67m）。 */
export const POS_SCALE = 100
/** 速度: 0.01m/s 単位（int16）。 */
export const VEL_SCALE = 100
/** yaw: 0〜2π を 0〜65535（u16）へ。 */
export const YAW_SCALE = 65535 / (Math.PI * 2)
/** pitch: -π/2〜+π/2 を -16384〜16384（i16）へ。 */
export const PITCH_QUANT_MAX = 16384
export const PITCH_SCALE = PITCH_QUANT_MAX / (Math.PI / 2)
/** 移動軸入力 moveX/moveZ（-1..1）を int8 に詰めるスケール（-100..100）。 */
export const MOVE_AXIS_SCALE = 100
export const MOVE_AXIS_MIN = -100
export const MOVE_AXIS_MAX = 100
/** 受信 dtMs がこれを超えたら clamp（切断しない）。単位は OPEN-A。 */
export const DT_MS_CLAMP = 500
/** buttons の bit9–15。非 0 なら不正記録（切断しない）。 */
export const INPUT_BUTTONS_RESERVED_MASK = 0xfe00

// ─────────────────────────────────────────────────────────────────────────
// パケットサイズ予算（payload と wire を厳密に区別する）
// ─────────────────────────────────────────────────────────────────────────
//
// 制約が効くのは「ワイヤー上の IP パケット/データグラムサイズ」であって、
// アプリが pack する payload ではない。
//   IPv4: wire = payload + UDP(8) + IPv4(20) = payload + 28
//   IPv6: wire = payload + UDP(8) + IPv6(40) = payload + 48
// Phase 1 は WebSocket/TCP だが、バイナリ固定レイアウトは WS↔WT 共通なので、
// 将来の WebTransport datagram（1 データグラム）を見据えて同じ予算で設計する。

/** 保守的な path MTU（VPN/トンネル考慮）。wire 上限。 */
export const WIRE_DATAGRAM_TARGET = 1200
export const UDP_HEADER_BYTES = 8
export const IPV4_HEADER_BYTES = 20
export const IPV6_HEADER_BYTES = 40
/** IP+UDP ヘッダの最悪ケース（IPv6）。 */
export const IP_UDP_HEADER_MAX = UDP_HEADER_BYTES + IPV6_HEADER_BYTES
/** アプリ payload の上限 = wire 上限 − ヘッダ予備（IPv6 最悪）。 */
export const PACKET_PAYLOAD_MAX = WIRE_DATAGRAM_TARGET - IP_UDP_HEADER_MAX

/**
 * スナップショットの payload 設計目標（20 人時の実測 ~330B に、
 * pitch/flags 追加と余裕を見て 360B）。packer のテストは payload と wire を
 * 別々に断言する。
 */
export const SNAPSHOT_PAYLOAD_TARGET = 360

/** 最大人数が詰まったスナップショットの payload サイズ（type + ヘッダ + 全員）。 */
export function snapshotPayloadBytes(playerCount: number): number {
  return PACKET_TYPE_BYTES + SNAPSHOT_HEADER_BYTES + playerCount * SNAPSHOT_PLAYER_BYTES
}

/** payload に IPv4 / IPv6 の IP+UDP ヘッダを加えたワイヤーサイズ。 */
export function wireBytes(payloadBytes: number, ipHeaderBytes: number): number {
  return payloadBytes + UDP_HEADER_BYTES + ipHeaderBytes
}

// ─────────────────────────────────────────────────────────────────────────
// 移動チューニング定数（参考値・要調整。docs/arch/sim-profiles.md）
// ─────────────────────────────────────────────────────────────────────────

/** 歩行速度（m/s）。 */
export const MOVE_SPEED = 8.0
/** 重力加速度（m/s²）。 */
export const GRAVITY = -20.0
/** ジャンプ初速（m/s）。 */
export const JUMP_FORCE = 7.0
