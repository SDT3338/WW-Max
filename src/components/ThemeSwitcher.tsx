'use client'

import { useEffect, useState } from 'react'

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
      <button 
        onClick={() => changeTheme('light')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${theme === 'light' ? 'shadow-sm bg-purple-100 text-purple-800' : 'opacity-60'}`}
      >
        Светлая
      </button>
      <button 
        onClick={() => changeTheme('dark')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${theme === 'dark' ? 'shadow-sm bg-gray-800 text-white' : 'opacity-60'}`}
      >
        Темная
      </button>
      <button 
        onClick={() => changeTheme('blue')} 
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${theme === 'blue' ? 'shadow-sm bg-blue-100 text-blue-800' : 'opacity-60'}`}
      >
        Синяя
      </button>
    </div>
  )
}