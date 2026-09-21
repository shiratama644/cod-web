/**
 * fps-ffa minimal mode — Official FPSのFFAサブモード
 *
 * 2026-09-22改訂版: Official FPSは1ゲーム複数モード [FFA,TDM,DOM]投票、FFAはその中の1サブモード。
 * L3 gamemode: @cod/gamemode-sdk のみ import (Biome境界)
 * world specはmap名のみ、spawnPointsはFpsCtx.getSpawnPoints()経由
 */

import { defineGameMode, type FpsCtx } from '@cod/gamemode-sdk'

const COUNTDOWN_TICKS = 60 * 3 // 3秒
const RESPAWN_TICKS = 60 * 3 // 3秒
const ENDED_TICKS = 60 * 5 // 5秒後にwaitingへ
const WIN_SCORE = 10

export default defineGameMode({
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  minPlayers: 2,
  maxPlayers: 16,
  world: {
    map: 'static-arena',
  },

  // --- 改訂版: 親ジャンル / サブタグ / subModes / カテゴリ / 表示 / 統計 ---
  parentGenre: 'fps',
  genres: ['ffa'], // サブタグ
  tags: ['official', 'pvp', 'fps'],
  subModes: ['ffa', 'tdm', 'dom'], // Official FPSは1ゲーム複数モード
  currentSubMode: 'ffa',
  category: 'Official',
  display: {
    title: 'FFA',
    description: 'Free For All - Official FPS subMode',
    thumbnail: '/thumbnails/ffa.png',
    creator: 'Official',
  },
  stats: {
    totalPlays: 1234,
    activePlayers: 12,
    detailViews: 567,
  },

  onRoomCreate(ctx) {
    ctx.setState('waiting')
  },

  onRoomDestroy(ctx) {
    ctx.setState('ended')
  },

  onPlayerJoin(ctx, player) {
    const fps = ctx as FpsCtx
    ctx.broadcastHud({ type: 'playerJoin', id: player.id, name: player.name })
    if (ctx.getState() === 'waiting' && ctx.players.length >= 2) {
      ctx.setState('countdown')
      ctx.broadcastHud({ type: 'countdown', duration: COUNTDOWN_TICKS })
      ctx.after(COUNTDOWN_TICKS, () => {
        if (ctx.getState() === 'countdown') {
          ctx.setState('playing')
          ctx.broadcastHud({ type: 'roundStart' })
          for (const p of ctx.players) {
            const spawns = fps.getSpawnPoints()
            if (spawns.length > 0) {
              const idx = fps.randomInt(0, spawns.length - 1)
              const sp = spawns[idx]
              ctx.broadcastHud({
                type: 'spawn',
                playerId: p.id,
                x: sp.x,
                y: sp.y,
                z: sp.z,
                yaw: sp.yaw,
              })
            }
          }
        }
      })
    }
  },

  onPlayerLeave(ctx, player) {
    ctx.broadcastHud({ type: 'playerLeave', id: player.id })
    if (ctx.getState() === 'playing' && ctx.players.length < 2) {
      ctx.setState('ended')
      ctx.broadcastHud({ type: 'roundEnd', reason: 'notEnoughPlayers' })
      ctx.after(ENDED_TICKS, () => {
        if (ctx.getState() === 'ended') {
          ctx.setState('waiting')
          for (const p of ctx.players) {
            ctx.setScore(p.id, 0)
          }
        }
      })
    }
  },

  onPlayerSpawn(ctx, player) {
    const fps = ctx as FpsCtx
    const spawns = fps.getSpawnPoints()
    if (spawns.length === 0) return
    const idx = fps.randomInt(0, spawns.length - 1)
    const sp = spawns[idx]
    fps.giveWeapon(player.id, 'rifle')
    fps.setAmmo(player.id, 30)
    ctx.broadcastHud({
      type: 'spawn',
      playerId: player.id,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      yaw: sp.yaw,
    })
  },

  onPlayerDeath(ctx, player, killer) {
    const fps = ctx as FpsCtx
    ctx.broadcastHud({
      type: 'death',
      playerId: player.id,
      killerId: killer?.id,
    })
    if (killer && killer.id !== player.id) {
      const newScore = ctx.getScore(killer.id) + 1
      ctx.setScore(killer.id, newScore)
      ctx.broadcastHud({ type: 'score', playerId: killer.id, score: newScore })
      if (newScore >= WIN_SCORE && ctx.getState() === 'playing') {
        ctx.setState('ended')
        ctx.broadcastHud({ type: 'roundEnd', winner: killer.id, reason: 'scoreLimit' })
        ctx.after(ENDED_TICKS, () => {
          if (ctx.getState() === 'ended') {
            ctx.setState('waiting')
            for (const p of ctx.players) {
              ctx.setScore(p.id, 0)
            }
            ctx.broadcastHud({ type: 'reset' })
          }
        })
      }
    }
    ctx.after(RESPAWN_TICKS, () => {
      const p = ctx.getPlayer(player.id)
      if (p && ctx.getState() === 'playing') {
        const spawns = fps.getSpawnPoints()
        if (spawns.length > 0) {
          const sIdx = fps.randomInt(0, spawns.length - 1)
          const sp = spawns[sIdx]
          fps.giveWeapon(p.id, 'rifle')
          fps.setAmmo(p.id, 30)
          ctx.broadcastHud({
            type: 'respawn',
            playerId: p.id,
            x: sp.x,
            y: sp.y,
            z: sp.z,
            yaw: sp.yaw,
          })
        }
      }
    })
  },

  onPlayerDamage(_ctx, _player, _damage, _attacker) {},

  onTick(ctx, _dtMs) {
    if (ctx.getState() === 'playing') {
      // 将来: 時間切れ判定等
    }
  },

  onWeaponFire(ctx, player, weaponId) {
    ctx.broadcastHud({ type: 'weaponFire', playerId: player.id, weaponId })
  },

  onHit(ctx, attacker, victim, damage) {
    ctx.broadcastHud({
      type: 'hit',
      attackerId: attacker.id,
      victimId: victim.id,
      damage,
    })
  },

  onNetworkMessage(ctx, player, msg) {
    try {
      const text = typeof msg === 'string' ? msg : new TextDecoder().decode(msg as Uint8Array)
      const parsed = JSON.parse(text)
      if (parsed && parsed.type === 'chat' && typeof parsed.text === 'string') {
        const chatText = parsed.text.slice(0, 200)
        ctx.broadcast(JSON.stringify({ type: 'chat', from: player.id, text: chatText }))
      }
    } catch {}
  },
})
