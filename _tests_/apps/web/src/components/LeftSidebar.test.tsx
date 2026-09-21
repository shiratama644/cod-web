// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeftSidebar } from '@/components/LeftSidebar.tsx'
import { useGameStore } from '@/store/gameStore.ts'

describe('LeftSidebar — Krunker風 + Sandboxボタン PH4-C', () => {
  beforeEach(() => {
    useGameStore.setState({ sandboxOpen: false })
  })

  it('renders sidebar with Play, Sandbox, Settings, Shop', () => {
    render(<LeftSidebar />)
    expect(screen.getByTestId('left-sidebar')).toBeTruthy()
    expect(screen.getByTestId('sidebar-play')).toBeTruthy()
    expect(screen.getByTestId('sidebar-sandbox')).toBeTruthy()
    expect(screen.getByTestId('sidebar-settings')).toBeTruthy()
    expect(screen.getByTestId('sidebar-shop')).toBeTruthy()
  })

  it('Sandbox button shows 公式拡張+UGC sublabel', () => {
    render(<LeftSidebar />)
    const btn = screen.getByTestId('sidebar-sandbox')
    expect(btn.textContent).toContain('Sandbox')
    expect(btn.textContent).toContain('公式拡張+UGC')
  })

  it('clicking Sandbox opens modal via store', () => {
    render(<LeftSidebar />)
    fireEvent.click(screen.getByTestId('sidebar-sandbox'))
    expect(useGameStore.getState().sandboxOpen).toBe(true)
  })

  it('controlled mode calls onOpenSandbox', () => {
    const onOpenSandbox = vi.fn()
    render(<LeftSidebar onOpenSandbox={onOpenSandbox} />)
    fireEvent.click(screen.getByTestId('sidebar-sandbox'))
    expect(onOpenSandbox).toHaveBeenCalled()
    expect(useGameStore.getState().sandboxOpen).toBe(false)
  })

  it('Play button has Official FPS sublabel', () => {
    render(<LeftSidebar />)
    expect(screen.getByTestId('sidebar-play').textContent).toContain('Official')
  })
})
