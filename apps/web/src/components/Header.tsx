import { useGameStore } from '../store/gameStore.ts'

export type OfficialTab = 'fps' | 'voxel'

export interface HeaderProps {
  activeTab?: OfficialTab
  onTabChange?: (tab: OfficialTab) => void
}

/**
 * Header — Officialゲームの切り替え (2026-09-22改訂版)
 *
 * - [FPS]タブ: 公式FPS画面を表示。1ゲーム複数モード [FFA,TDM,DOM]、投票で次決定。
 * - [Voxel]タブ: 公式Voxel画面を表示。1モードのみ [Survival]、永続サバイバル。
 * - Officialゲームの切り替え。デフォルト Official FPS。
 */
export function Header({ activeTab: controlledTab, onTabChange }: HeaderProps) {
  const storeTab = useGameStore((s) => s.activeTab)
  const setActiveTab = useGameStore((s) => s.setActiveTab)

  const activeTab = controlledTab ?? storeTab

  const handleTabChange = (tab: OfficialTab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setActiveTab(tab)
    }
  }

  return (
    <header className="hub-header" data-testid="hub-header">
      <div className="hub-logo" data-testid="hub-logo">
        COD-WEB
      </div>
      <nav className="hub-nav" data-testid="hub-nav">
        <button
          className={activeTab === 'fps' ? 'hub-tab active' : 'hub-tab'}
          data-testid="tab-fps"
          onClick={() => handleTabChange('fps')}
          type="button"
        >
          FPS
          <span className="hub-tab-sub">Official 1ゲーム複数モード</span>
        </button>
        <button
          className={activeTab === 'voxel' ? 'hub-tab active' : 'hub-tab'}
          data-testid="tab-voxel"
          onClick={() => handleTabChange('voxel')}
          type="button"
        >
          Voxel
          <span className="hub-tab-sub">Survival永続</span>
        </button>
      </nav>
      <div className="hub-actions" data-testid="hub-actions">
        <span className="hub-search" data-testid="hub-search">
          Search
        </span>
        <span className="hub-user" data-testid="hub-user">
          User
        </span>
      </div>
    </header>
  )
}
