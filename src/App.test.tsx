import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'cod-web' })).toBeInTheDocument()
  })

  it('renders the foundation description', () => {
    render(<App />)
    expect(screen.getByText(/foundation scaffolding/i)).toBeInTheDocument()
  })
})
