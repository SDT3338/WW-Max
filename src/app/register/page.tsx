'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/feed')
    })
  }, [router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      if (error.message.includes('already registered')) {
        setMessage('Этот email уже зарегистрирован. Попробуйте войти.')
      } else if (error.message.includes('Password should be')) {
        setMessage('Пароль слишком короткий (минимум 6 символов).')
      } else {
        setMessage(error.message)
      }
    } else {
      setMessage('Регистрация успешна! Теперь вы можете войти.')
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        <h1 className="text-3xl font-extrabold text-center mb-8" style={{ color: 'var(--primary-text)' }}>
          Регистрация
        </h1>
        
        {message && (
          <div className={`mb-6 p-3 text-sm text-center rounded-lg font-medium ${message.includes('уже') || message.includes('короткий') || message.includes('Ошибка') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-lg border px-4 py-2.5 pr-12 shadow-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-color)' }}
              >
                👁
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>
        </form>

        <div className="text-center text-sm mt-6">
          <Link href="/login" className="font-medium transition-colors hover:opacity-80" style={{ color: 'var(--primary-color)' }}>
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  )
}