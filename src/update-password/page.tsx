'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [isValidSession, setIsValidSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Небольшая задержка, чтобы Supabase успел обработать токен из URL
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidSession(true)
        }
        setCheckingSession(false)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage('Ошибка: ' + error.message)
    } else {
      setMessage('Пароль успешно изменен! Перенаправляем в ленту...')
      setTimeout(() => router.push('/feed'), 2000)
    }
    setLoading(false)
  }

  if (checkingSession) {
    return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Проверка ссылки...</div>
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl shadow-sm border text-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <h1 className="text-xl font-bold mb-4 text-red-500">Ссылка недействительна</h1>
          <p className="text-sm opacity-70 mb-6">Возможно, срок действия ссылки истек, или вы перешли по ней повторно.</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--primary-text)' }}>
          Новый пароль
        </h1>

        {message && (
          <div className={`mb-6 p-3 text-sm text-center rounded-lg font-medium ${message.includes('Ошибка') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Придумайте новый пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Минимум 6 символов"
              className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}