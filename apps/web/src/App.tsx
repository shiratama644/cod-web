import { useMemo } from 'react'
import { RendererHud } from './components/RendererHud'
import { StartOverlay } from './components/StartOverlay'
import { TouchControls } from './components/TouchControls'
import { InputController } from './game/input/InputController'
import { GameCanvas } from './game/GameCanvas'

export function App() {
  // 入力コントローラは 1 インスタンスだけ生成し、タッチ UI（ジョイスティック/ジャンプ
  // ボタン）と 3D シーン（キーボード/マウス・シミュレーション駆動）で共有する。
  const input = useMemo(() => new InputController(), [])

  return (
    <main className="app">
      <GameCanvas input={input} />
      <RendererHud />
      <TouchControls input={input} />
      <StartOverlay />
    </main>
  )
}
