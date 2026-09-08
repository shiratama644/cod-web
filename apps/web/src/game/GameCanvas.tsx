/**
 * Babylon.js が所有するゲーム用 canvas。
 *
 * PH1-D で React 管理の 3D Canvas を削除し、React は canvas DOM の配置とライフサイクル
 * 管理だけを担う。3D scene / render loop / mesh 更新は BabylonGame が命令型に行う。
 */

import { useEffect, useRef } from 'react'
import type { InputController } from './input/InputController'
import { BabylonGame } from './babylon/BabylonGame'

export function GameCanvas({ input }: { input: InputController }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = new BabylonGame(canvas, input)
    game.start()

    return () => {
      game.dispose()
    }
  }, [input])

  return <canvas ref={canvasRef} className="game-canvas" tabIndex={-1} aria-label="Game view" />
}
