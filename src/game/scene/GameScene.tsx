/**
 * GameScene — ネットワーク・入力・予測・補間を束ね、R3F の useFrame で駆動する。
 *
 * Phase 1（位置同期）: マウント時に GameClient を生成してサーバーへ接続し、
 * 入力コントローラ（キーボード/マウス・仮想ジョイスティック・ジャンプボタン）を
 * 登録、毎フレーム `client.frame(dt)` を呼ぶ。プレイヤー描画は <Players />。
 *
 * 高頻度値は React state を通さず GameClient と ref のみ（黄金ループ4/5）。
 * GameClient は useMemo で 1 インスタンスを生成し、useEffect で接続/解放する。
 * InputController は App で生成され props で渡る（タッチ UI と共有）。
 */

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { InputController } from '../input/InputController'
import { GameClient } from '../net/GameClient'
import { Players } from './Players'

export function GameScene({ input }: { input: InputController }) {
  // 1 インスタンスだけ生成（レンダー中に確定するので <Players /> に渡せる）。
  const client = useMemo<GameClient>(() => new GameClient(), [])

  useEffect(() => {
    client.setInput(input)
    const canvas = document.querySelector('canvas')
    if (canvas) input.attach(canvas)

    // eslint-disable-next-line no-console
    client.onStatusChange = (s) => console.log(`[net] ${s}`)
    client.connect()

    return () => {
      input.dispose()
      client.dispose()
    }
  }, [client, input])

  useFrame((_, delta) => {
    // delta を固定送信レートに対して積み上げる（大きなフレームはクランプ）。
    client.frame(Math.min(delta, 0.1))
  })

  return <Players client={client} />
}
