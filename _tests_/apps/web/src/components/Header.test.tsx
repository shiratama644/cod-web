// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/Header.tsx'
import { useGameStore } from '@/store/gameStore.ts'

describe('Header — Official FPS/Voxel切替 PH4-B', () => {
  beforeEach(() => {
    useGameStore.setState({ activeTab: 'fps' })
  })

  it('renders logo and tabs', () => {
    render(<Header />)
    expect(screen.getByTestId('hub-header')).toBeTruthy()
    expect(screen.getByTestId('hub-logo').textContent).toBe('COD-WEB')
    expect(screen.getByTestId('tab-fps')).toBeTruthy()
    expect(screen.getByTestId('tab-voxel')).toBeTruthy()
  })

  it('activeTab fps by default', () => {
    render(<Header />)
    const fpsTab = screen.getByTestId('tab-fps')
    expect(fpsTab.className).toContain('active')
  })

  it('clicking voxel tab changes activeTab in store', () => {
    render(<Header />)
    const voxelTab = screen.getByTestId('tab-voxel')
    fireEvent.click(voxelTab)
    expect(useGameStore.getState().activeTab).toBe('voxel')
  })

  it('controlled mode uses props and calls onTabChange', () => {
    const onTabChange = vi.fn()
    render(<Header activeTab="voxel" onTabChange={onTabChange} />)
    expect(screen.getByTestId('tab-voxel').className).toContain('active')
    fireEvent.click(screen.getByTestId('tab-fps'))
    expect(onTabChange).toHaveBeenCalledWith('fps')
    // controlled: store should not change if onTabChange provided (component delegates)
    expect(useGameStore.getState().activeTab).toBe('fps')
  })

  it('shows sub labels for Official FPS 1ゲーム複数モード and Voxel永続', () => {
    render(<Header />)
    expect(screen.getByTestId('tab-fps').textContent).toContain('FPS')
    expect(screen.getByTestId('tab-fps').textContent).toContain('Official')
    expect(screen.getByTestId('tab-voxel').textContent).toContain('Voxel')
    expect(screen.getByTestId('tab-voxel').textContent).toContain('Survival')
  })
})
