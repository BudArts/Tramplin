import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import './App.css'

function App() {
  return (
    <div className="app">
      {/* Фоновые свечения */}
      <div className="app__bg-glow app__bg-glow--1" />
      <div className="app__bg-glow app__bg-glow--2" />
      <div className="app__bg-glow app__bg-glow--3" />

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          {/* Будущие страницы */}
          {/* <Route path="login" element={<LoginPage />} /> */}
          {/* <Route path="register" element={<RegisterPage />} /> */}
          {/* <Route path="profile" element={<ProfilePage />} /> */}
        </Route>
      </Routes>
    </div>
  )
}

export default App