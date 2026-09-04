import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library: 各テスト後にレンダリングした DOM を自動クリーンアップ。
afterEach(() => {
  cleanup()
})
