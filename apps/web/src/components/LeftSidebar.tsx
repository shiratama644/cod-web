import { useGameStore } from '../store/gameStore.ts'

export interface LeftSidebarProps {
  onOpenSandbox?: () => void
}

/**
 * LeftSidebar — Krunker風縦ボタン群 (PH4-C)
 *
 * - [Play] Official FPS (デフォルト)
 * - [Sandbox] 押下で Sandbox モーダル (公式拡張+UGC)
 * - [Settings]
 * - [Shop]
 */
export function LeftSidebar({ onOpenSandbox }: LeftSidebarProps) {
  const setSandboxOpen = useGameStore((s) => s.setSandboxOpen)

  const handleOpenSandbox = () => {
    if (onOpenSandbox) {
      onOpenSandbox()
    } else {
      setSandboxOpen(true)
    }
  }

  return (
    <aside className="left-sidebar krunker-style" data-testid="left-sidebar">
      <button className="sidebar-btn" data-testid="sidebar-play" type="button">
        Play
        <span className="sidebar-btn-sub">Official FPS</span>
      </button>
      <button
        className="sidebar-btn sandbox-btn"
        data-testid="sidebar-sandbox"
        onClick={handleOpenSandbox}
        type="button"
      >
        Sandbox
        <span className="sidebar-btn-sub">公式拡張+UGC</span>
      </button>
      <button className="sidebar-btn" data-testid="sidebar-settings" type="button">
        Settings
      </button>
      <button className="sidebar-btn" data-testid="sidebar-shop" type="button">
        Shop
      </button>
    </aside>
  )
}
