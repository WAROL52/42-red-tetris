// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import { BoardView, visibleRows } from './BoardView.tsx'
import { SpectrumView } from './SpectrumView.tsx'
import { QueueNext } from './QueueNext.tsx'
import { JoinScreen } from '../screens/JoinScreen.tsx'
import { createGame, spawn, COLS, VISIBLE_ROWS, TOTAL_ROWS, type Cell } from '../engine/engine.ts'

describe('BoardView', () => {
  it('renders a 10x20 grid', () => {
    render(<BoardView engine={createGame()} />)
    expect(screen.getByRole('grid')).toBeTruthy()
    expect(screen.getAllByRole('gridcell')).toHaveLength(COLS * VISIBLE_ROWS)
  })

  it('visibleRows excludes the buffer and paints the falling piece', () => {
    const board: Cell[][] = Array.from({ length: TOTAL_ROWS }, () => new Array<Cell>(COLS).fill(null))
    board[TOTAL_ROWS - 1]![0] = 'T'
    const state = spawn({ ...createGame(), board }, 'T')
    const rows = visibleRows(state)
    expect(rows).toHaveLength(VISIBLE_ROWS)
    expect(rows[0]).toHaveLength(COLS)
    expect(rows[VISIBLE_ROWS - 1]![0]).toBe('T')
    expect(rows.some((row) => row.some((c) => c === 'T'))).toBe(true)
  })
})

describe('SpectrumView', () => {
  it('shows one bar per column and the player name', () => {
    const { container } = render(
      <SpectrumView name="bob" spectrum={[1, 2, 3, 4, 5, 6, 7, 8, 9, 0]} eliminated={false} />,
    )
    expect(container.querySelectorAll('.spectrum-fill')).toHaveLength(10)
    expect(screen.getByText('bob')).toBeTruthy()
  })

  it('flags eliminated players', () => {
    render(<SpectrumView name="bob" spectrum={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]} eliminated={true} />)
    expect(screen.getByText('bob ✝')).toBeTruthy()
  })
})

describe('QueueNext', () => {
  it('renders a mini piece for each queued kind', () => {
    render(<QueueNext queue={['T', 'J', 'I']} />)
    expect(screen.getByLabelText('T next')).toBeTruthy()
    expect(screen.getByLabelText('J next')).toBeTruthy()
    expect(screen.getByLabelText('I next')).toBeTruthy()
  })

  it('renders nothing for an empty queue', () => {
    const { container } = render(<QueueNext queue={[]} />)
    expect(container.querySelector('.queue')).toBeNull()
  })
})

describe('JoinScreen', () => {
  function Probe() {
    const { room = '', name = '' } = useParams()
    return <div>game for {room} {name}</div>
  }

  it('navigates to /room/name after joining', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<JoinScreen />} />
          <Route path="/:room/:name" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('zen'), { target: { value: ' zen! ' } })
    fireEvent.change(screen.getByPlaceholderText('alice'), { target: { value: 'alice_1' } })
    fireEvent.click(screen.getByRole('button', { name: 'join' }))
    expect(screen.getByText('game for zen alice_1')).toBeTruthy()
  })
})