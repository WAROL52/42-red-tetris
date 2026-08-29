// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('serves the join screen at the root and redirects to the game room', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /red\s+tetris/ })).toBeDefined()
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0]!, { target: { value: 'zen' } })
    fireEvent.change(inputs[1]!, { target: { value: 'alice' } })
    await fireEvent.click(screen.getByRole('button', { name: 'join' }))
    expect(window.location.pathname).toBe('/zen/alice')
  })
})