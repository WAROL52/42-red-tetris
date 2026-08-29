import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

function sanitize(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]/g, '')
}

export function JoinScreen() {
  const navigate = useNavigate()
  const [room, setRoom] = useState('')
  const [name, setName] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cleanRoom = sanitize(room)
    const cleanName = sanitize(name)
    if (cleanRoom.length === 0 || cleanName.length === 0) {
      return
    }
    navigate(`/${encodeURIComponent(cleanRoom)}/${encodeURIComponent(cleanName)}`)
  }

  return (
    <form className="join" onSubmit={submit}>
      <h1>red&nbsp;tetris</h1>
      <label>
        room
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="zen"
          autoFocus
        />
      </label>
      <label>
        name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="alice"
        />
      </label>
      <button type="submit" disabled={sanitize(room).length === 0 || sanitize(name).length === 0}>
        join
      </button>
    </form>
  )
}