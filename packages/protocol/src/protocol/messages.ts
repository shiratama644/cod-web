/**
 * ネットワークでやり取りするメッセージの型定義。
 * クライアント/サーバーで同一の型を共有する。
 *
 * 量子化（バイナリ詰め込み）は packer.ts が担当し、ここでは人間が扱う
 * 「デコード済みの値」を型として持つ。シミュレーションは必ずこの
 * デコード後の値を使う（決定論のため、量子化誤差を両者で揃える）。
 */

/**
 * クライアント→サーバーの入力（デコード済み・人間が扱う値）。
 * 移動は yaw を基準にした前後左右。
 */
export interface PlayerInput {
  /** 入力シーケンス番号（単調増加）。予測/調停に使う。 */
  seq: number
  /** 左右移動（-1 = 左, 0, +1 = 右）。 */
  moveX: number
  /** 前後移動（-1 = 後, 0, +1 = 前）。 */
  moveZ: number
  /** 水平視点（ラジアン）。 */
  yaw: number
  /** 垂直視点（ラジアン、-π/2〜+π/2）。 */
  pitch: number
  /** buttons u16（jump 等）。INPUT_FLAG_* を参照。 */
  flags: number
  /** 前入力からの経過時間（ms）。 */
  dtMs: number
}

/** PlayerInput.flags のビット。 */
export const INPUT_FLAG_JUMP = 1 << 0
export const INPUT_FLAG_CROUCH = 1 << 1

/**
 * プレイヤー 1 人分の権威状態（シミュレーションが扱うフラットな値）。
 * スナップショットに含まれるのは位置・速度・yaw のみ（Phase 1）。
 */
export interface SnapshotPlayer {
  /** ルーム内で一意のプレイヤー ID。 */
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** 水平視点（ラジアン）。 */
  yaw: number
}

/**
 * サーバー→クライアントのスナップショット（デコード済み）。
 */
export interface Snapshot {
  /** サーバーのシム tick 番号（60Hz 刻みの値が 30Hz で飛ぶ）。 */
  serverTick: number
  /** 受信クライアントについて処理済みの最新入力 seq（調停用）。 */
  lastAckSeq: number
  /** ルーム内の全プレイヤー（Phase 1 はフルスナップショット・AOI なし）。 */
  players: SnapshotPlayer[]
}
