import { RendererHud } from './components/RendererHud'
import { GameCanvas } from './game/GameCanvas'

export function App() {
  return (
    <main className="app">
      <GameCanvas />
      <RendererHud />
    </main>
  )
}
