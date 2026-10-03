import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library: 各テスト後にレンダリングした DOM を自動クリーンアップ。
afterEach(() => {
  cleanup()
})
