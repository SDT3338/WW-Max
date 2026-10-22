'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsLoggedIn(true)
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      
      <header className="p-6 flex justify-between items-center max-w-6xl w-full mx-auto">
        <div className="text-2xl font-black tracking-tighter flex items-center gap-1">
          <span style={{ color: 'var(--primary-color)' }}>WW</span>
          <span style={{ color: 'var(--text-color)' }}>-Max</span>
        </div>
        <div className="flex gap-3">
          {isLoggedIn ? (
            <Link 
              href="/feed"
              className="px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Перейти в ленту
            </Link>
          ) : (
            <Link 
              href="/login"
              className="px-5 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-black/5"
              style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}
            >
              Войти в систему
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto py-12">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
          Студенческий портал
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none" style={{ color: 'var(--text-color)' }}>
          <span style={{ color: 'var(--primary-color)' }}>WW</span>-Max
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: 'var(--text-color)' }}>
          Лента новостей для студентов
        </h2>
        
        <p className="text-lg opacity-70 mb-10 max-w-2xl mx-auto">
          Будьте в курсе всех событий вашего университета. Публикуйте анонсы, делитесь фотографиями и получайте обратную связь.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          {isLoggedIn ? (
            <Link 
              href="/feed"
              className="px-8 py-4 text-base font-bold text-white rounded-xl shadow-lg transition-transform hover:-translate-y-1"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Открыть ленту новостей
            </Link>
          ) : (
            <>
              <Link 
                href="/register"
                className="px-8 py-4 text-base font-bold text-white rounded-xl shadow-lg transition-transform hover:-translate-y-1"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Создать аккаунт
              </Link>
              <Link 
                href="/login"
                className="px-8 py-4 text-base font-bold rounded-xl border transition-colors hover:bg-black/5"
                style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}
              >
                Войти
              </Link>
            </>
          )}
        </div>
      </main>

    </div>
  )
}