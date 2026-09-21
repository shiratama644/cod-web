import { useMemo } from 'react'
import { Header } from './components/Header.tsx'
import { RendererHud } from './components/RendererHud.tsx'
import { StartOverlay } from './components/StartOverlay.tsx'
import { TouchControls } from './components/TouchControls.tsx'
import { InputController } from './game/input/InputController.ts'
import { GameCanvas } from './game/GameCanvas.tsx'

export function App() {
  // 入力コントローラは 1 インスタンスだけ生成し、タッチ UI（ジョイスティック/ジャンプ
  // ボタン）と 3D シーン（キーボード/マウス・シミュレーション駆動）で共有する。
  const input = useMemo(() => new InputController(), [])

  return (
    <main className="app">
      <Header />
      <div className="app-game-area">
        <GameCanvas input={input} />
        <RendererHud />
        <TouchControls input={input} />
        <StartOverlay />
      </div>
    </main>
  )
}
