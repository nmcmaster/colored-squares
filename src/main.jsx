import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ColorMatchGame from './ColorMatchGame'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ColorMatchGame />} />
        <Route path="/watch" element={<ColorMatchGame autoStartWatch />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
