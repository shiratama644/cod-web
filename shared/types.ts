/**
 * クライアント/サーバー共有のゲーム状態型。
 * データ指向（ECS スタイル）: エンティティは整数 ID、状態はフラットな数値フィールド。
 * Phase 1 はプレーンな typed オブジェクト/配列で扱い、システムは配列に作用する
 * 純粋関数として書く（bitecs への載せ替えを後で容易にする）。
 */

/**
 * プレイヤー 1 体のシミュレーション状態。
 * 位置は「カプセルの足元（キャラクターの立ち位置）」の座標。
 */
export interface PlayerState {
  /** ルーム内で一意のエンティティ/プレイヤー ID。 */
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  yaw: number
  pitch: number
  /** 接地中か（ジャンプは接地時のみ）。 */
  grounded: boolean
  /** このプレイヤーについて処理済みの最新入力 seq（調停/ack 用）。 */
  lastInputSeq: number
}

/** プレイヤーの初期状態を生成する（スポーン位置）。 */
export function createPlayerState(id: number, x = 0, y = 5, z = 0): PlayerState {
  return {
    id,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    grounded: false,
    lastInputSeq: 0,
  }
}

/**
 * シミュレーション世界（データ指向の器）。
 * Phase 1 はプレーンな配列。システム関数はこの配列をループして純粋関数を適用する。
 * 将来 bitecs に載せ替える際は内部構造だけ差し替える。
 */
export interface SimWorld {
  players: PlayerState[]
}

export function createSimWorld(): SimWorld {
  return { players: [] }
}
