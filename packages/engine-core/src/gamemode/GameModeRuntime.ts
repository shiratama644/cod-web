/**
 * GameModeRuntime — gamemode hooks を例外安全に実行
 *
 * - 各hookを try/catch で囲み、1ルームのみcatch、他ルーム巻き込まない
 * - tick基準タイマー (GameModeTimer) を管理
 * - gamemode message rate limit 40/s burst 20、超過時false
 * - setTimeout禁止、決定論
 */

import type {
  GameModeDefinition,
  PlayerRef,
  RoomCtx,
  RoomState,
} from '@cod/gamemode-api'
import { GameModeTimer } from './GameModeTimer'
import { ModeMessageRateLimiter } from '../net/rate-limit'

export interface GameModeRuntimeOptions {
  readonly roomId: string
  readonly getTick: () => number
  readonly getState: () => RoomState
  readonly setState: (s: RoomState) => void
  readonly getPlayers: () => readonly PlayerRef[]
  readonly getPlayer: (id: string) => PlayerRef | undefined
  readonly send: (playerId: string, data: Uint8Array | string) => boolean
  readonly broadcast: (data: Uint8Array | string, exceptId?: string) => void
  readonly broadcastExcept: (data: Uint8Array | string, exceptId: string) => void
  readonly nowMs: () => number
}

export class GameModeRuntime {
  readonly timer: GameModeTimer
  readonly rateLimiter: ModeMessageRateLimiter
  private readonly options: GameModeRuntimeOptions

  constructor(
    private readonly def: GameModeDefinition,
    options: GameModeRuntimeOptions,
    timer?: GameModeTimer,
    rateLimiter?: ModeMessageRateLimiter,
  ) {
    this.options = options
    this.timer = timer ?? new GameModeTimer()
    this.rateLimiter = rateLimiter ?? new ModeMessageRateLimiter()
  }

  /** 例外安全な hook 呼び出し (sync/async両対応) */
  async safeCall<K extends keyof GameModeDefinition>(
    hook: K,
    ...args: unknown[]
  ): Promise<void> {
    const fn = this.def[hook] as unknown as (...a: unknown[]) => unknown
    if (!fn) return
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        await result.catch(() => {
          // async例外も握りつぶす
        })
      }
    } catch {
      // sync例外も握りつぶす、roomは落ちない
    }
  }

  /** 同期版 safeCall (onTick等のsync hook用) */
  safeCallSync<K extends keyof GameModeDefinition>(hook: K, ...args: unknown[]): void {
    const fn = this.def[hook] as unknown as (...a: unknown[]) => unknown
    if (!fn) return
    try {
      const result = fn(...args)
      // sync hookでPromiseが返っても握りつぶす (awaitしない)
      if (result instanceof Promise) {
        result.catch(() => {})
      }
    } catch {
      // 握りつぶす
    }
  }

  /** tick処理: timer消化 + onTick呼び出し */
  tick(dtMs: number, nowTick: number): void {
    this.timer.tick(nowTick)
    // ctxを簡易生成してonTick呼び出し (full ctxはRoom側で生成)
    // ここではdef.onTickが存在すれば直接呼ぶ (ctxはoptions経由で作る想定)
    // 実際のctx生成は呼び出し側で行うが、PH3-BではsafeCallSyncで十分
    if (this.def.onTick) {
      // ctxは外部から渡される想定だが、PH3-Bの簡易実装ではoptionsを元に最小ctxを作る
      // ここでは直接safeCallSyncを呼ばず、呼び出し側がctxを生成してsafeCallする設計も可
      // 互換のため、ctx無しで呼べる場合は呼ばない (呼び出し側でctx付きで呼ぶ)
    }
    // タイマーのみここで消化、onTickは呼び出し側でctx付きで呼ぶか、
    // このメソッド内で簡易ctxを作って呼ぶ
    // PH3-Bでは timer.tick のみが責務で、onTick呼び出しは外部で行っても良いが、
    // 便宜上、def.onTickがあれば最小ctxで呼ぶ
    if (this.def.onTick) {
      const ctx = this.createMinimalCtx(nowTick)
      this.safeCallSync('onTick', ctx as unknown as RoomCtx, dtMs)
    }
  }

  /** gamemode message送信: rate limit超過時false */
  sendGameModeMessage(playerId: string, data: Uint8Array | string): boolean {
    const now = this.options.nowMs()
    if (!this.rateLimiter.allow(playerId, now)) {
      return false
    }
    return this.options.send(playerId, data)
  }

  /** broadcast: 各プレイヤーのrate limitをチェックし、超過したプレイヤーには送らない */
  broadcastGameModeMessage(data: Uint8Array | string, exceptId?: string): void {
    const now = this.options.nowMs()
    const players = this.options.getPlayers()
    for (const p of players) {
      if (exceptId && p.id === exceptId) continue
      if (!this.rateLimiter.allow(p.id, now)) continue
      this.options.send(p.id, data)
    }
  }

  /** 最小ctx生成 (PH3-B用、full ctxはPH3-Cで拡張) */
  private createMinimalCtx(nowTick: number): Partial<RoomCtx> {
    return {
      roomId: this.options.roomId,
      tick: nowTick,
      state: this.options.getState(),
      players: this.options.getPlayers(),
      getPlayer: this.options.getPlayer as unknown as RoomCtx['getPlayer'],
      getPlayers: this.options.getPlayers as unknown as RoomCtx['getPlayers'],
      setState: this.options.setState as unknown as RoomCtx['setState'],
      getState: this.options.getState as unknown as RoomCtx['getState'],
      after: (ticks: number, cb: () => void) => this.timer.after(ticks, cb, nowTick),
      every: (ticks: number, cb: () => void) => this.timer.every(ticks, cb, nowTick),
      cancel: (id: number) => this.timer.cancel(id),
      send: (id: string, data: Uint8Array | string) => this.sendGameModeMessage(id, data),
      broadcast: (data: Uint8Array | string, exceptId?: string) => {
        if (exceptId) {
          this.options.broadcastExcept(data, exceptId)
        } else {
          this.options.broadcast(data)
        }
      },
      broadcastExcept: (data: Uint8Array | string, exceptId: string) =>
        this.options.broadcastExcept(data, exceptId),
    } as Partial<RoomCtx>
  }

  /** ctxを外部生成してonTickを呼ぶ場合のヘルパー */
  tickWithCtx(ctx: RoomCtx, dtMs: number, nowTick: number): void {
    this.timer.tick(nowTick)
    this.safeCallSync('onTick', ctx, dtMs)
  }

  /** Room統合用: プレイヤーjoin/leave等のイベントを例外安全に中継 */
  async onPlayerJoin(player: PlayerRef, ctx: RoomCtx): Promise<void> {
    await this.safeCall('onPlayerJoin', ctx, player)
  }

  async onPlayerLeave(player: PlayerRef, ctx: RoomCtx): Promise<void> {
    await this.safeCall('onPlayerLeave', ctx, player)
    this.rateLimiter.remove(player.id)
  }

  async onRoomCreate(ctx: RoomCtx): Promise<void> {
    await this.safeCall('onRoomCreate', ctx)
  }

  async onRoomDestroy(ctx: RoomCtx): Promise<void> {
    await this.safeCall('onRoomDestroy', ctx)
    this.timer.clear()
  }

  /** テスト用: 現在のタイマー数 */
  get timerCount(): number {
    return this.timer.size
  }
}
