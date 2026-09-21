/**
 * Room — 1 マッチのインスタンス。
 *
 * Phase 1 は単一デフォルトルーム（マッチメイキング・seat reservation は後続）。
 * 参加/離退と playerId の払い出し、プレイヤー状態の保持を担う。
 *
 * ソケット層（bun の WebSocket）と純粋なルームロジックを分離し、単体テストでは
 * ソケットを使わずに join/leave を駆動できるようにする。
 */

import { MAX_PLAYERS } from '@cod/protocol/protocol/constants'
import { createPlayerState, type PlayerState } from '@cod/protocol/types'
import type { SimProfile } from '../profile/SimProfile'

/** 参加者 1 人あたりのコネクション情報（ソケット実装への参照を疎結合に保持）。 */
export interface Peer {
  playerId: number
  /** 制御メッセージ（welcome/join/leave）を送る関数（テキスト JSON）。 */
  sendText: (data: string) => void
  /**
   * バイナリ送信。bun `ws.send` と同じ戻り値。
   * -1 バックプレッシャ（キュー済み）、0 破棄、1+ 送信バイト。
   */
  sendBinary: (data: ArrayBufferView) => number
  /** send が 0 のときソケットを切る。テストでは省略可。 */
  disconnect?: (code: number, reason: string) => void
}

/** gamemode 統合用の最小インターフェース (循環参照回避のため) */
export interface GameModeRoomBinding {
  rateLimiter?: { remove(id: string): void; removeNumber?(id: number): void }
}

export interface RoomOptions {
  /** L2 profile から player spawn と maxPlayers を注入する。 */
  readonly profile?: Pick<SimProfile<unknown, PlayerState, unknown>, 'typeSpec' | 'createPlayerState'>
  /** テスト / adapter 用の直接差し替え。profile 指定時もこちらを優先する。 */
  readonly createPlayerState?: (playerId: number) => PlayerState
  /** テスト / adapter 用の直接差し替え。profile 指定時もこちらを優先する。 */
  readonly maxPlayers?: number
}

export class Room {
  /** playerId → PlayerState。 */
  private readonly players = new Map<number, PlayerState>()
  /** playerId → Peer（コネクション）。 */
  private readonly peers = new Map<number, Peer>()
  private nextPlayerId = 1
  private readonly createPlayer: (playerId: number) => PlayerState
  private gameModeBinding?: GameModeRoomBinding

  readonly maxPlayers: number

  constructor(options: RoomOptions = {}) {
    this.maxPlayers = options.maxPlayers ?? options.profile?.typeSpec.maxPlayers ?? MAX_PLAYERS
    this.createPlayer = options.createPlayerState ?? options.profile?.createPlayerState ?? createPlayerState
  }

  /** gamemode 統合: GameModeRuntime の rateLimiter 等をバインド */
  setGameModeBinding(binding: GameModeRoomBinding): void {
    this.gameModeBinding = binding
  }

  getGameModeBinding(): GameModeRoomBinding | undefined {
    return this.gameModeBinding
  }

  /** 現在の参加人数。 */
  get playerCount(): number {
    return this.players.size
  }

  /** 参加している全プレイヤー状態（スナップショット生成・シムで使用）。旧API: hot pathでは getPlayersIterable を使う。 */
  getPlayers(): PlayerState[] {
    return [...this.players.values()]
  }

  /** ゼロアロケ用: Map.values() の Iterable を直接返す。配列確保しない。 */
  getPlayersIterable(): Iterable<PlayerState> {
    return this.players.values()
  }

  /** ゼロアロケ用: peers の Iterable。 */
  getPeersIterable(): Iterable<Peer> {
    return this.peers.values()
  }

  getPlayer(id: number): PlayerState | undefined {
    return this.players.get(id)
  }

  /** 指定プレイヤーの接続ピア（スナップショット個別送信に使用）。 */
  getPeer(id: number): Peer | undefined {
    return this.peers.get(id)
  }

  /**
   * プレイヤーを参加させる。
   * @returns 払い出した playerId。満員なら null（参加拒否）。
   */
  join(peer: Peer): number | null {
    if (this.players.size >= this.maxPlayers) return null
    const id = this.nextPlayerId++
    const state = this.createPlayer(id)
    this.players.set(id, state)
    this.peers.set(id, peer)

    // 本人には welcome（playerId と現 roster）を、他の参加者には join を送る。
    const roster = this.roster()
    peer.sendText(JSON.stringify({ kind: 'welcome', playerId: id, roster }))
    this.broadcastExcept(id, JSON.stringify({ kind: 'join', playerId: id }))
    return id
  }

  /** プレイヤーを離脱させる。 */
  leave(playerId: number): void {
    if (!this.players.has(playerId)) return
    this.players.delete(playerId)
    this.peers.delete(playerId)
    // gamemode rate limiter のクリーンアップ (メモリリーク防止)
    if (this.gameModeBinding?.rateLimiter) {
      const rl = this.gameModeBinding.rateLimiter
      // string id と number id 両方で削除を試みる
      try {
        rl.remove(String(playerId))
      } catch {}
      try {
        rl.removeNumber?.(playerId)
      } catch {}
    }
    this.broadcast(JSON.stringify({ kind: 'leave', playerId }))
  }

  /** 現在の playerId 一覧。 */
  roster(): number[] {
    return [...this.players.keys()]
  }

  /** 全員にテキスト送信。 */
  broadcast(data: string): void {
    for (const peer of this.peers.values()) peer.sendText(data)
  }

  /** 指定プレイヤー以外にテキスト送信。 */
  private broadcastExcept(exceptId: number, data: string): void {
    for (const [id, peer] of this.peers) {
      if (id !== exceptId) peer.sendText(data)
    }
  }
}
