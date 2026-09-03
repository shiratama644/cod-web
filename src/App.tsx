import { RendererHud } from './components/RendererHud'
import { StartOverlay } from './components/StartOverlay'
import { GameCanvas } from './game/GameCanvas'

export function App() {
  return (
    <main className="app">
      <GameCanvas />
      <RendererHud />
      <StartOverlay />
    </main>
  )
}
