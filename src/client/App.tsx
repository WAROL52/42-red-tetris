import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { JoinScreen } from './screens/JoinScreen.tsx'
import { GameScreen } from './screens/GameScreen.tsx'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/:room/:playerName" element={<GameScreen />} />
      </Routes>
    </BrowserRouter>
  )
}