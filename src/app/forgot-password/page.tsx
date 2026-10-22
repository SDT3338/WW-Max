'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setMessage('Ошибка: ' + error.message)
    } else {
      setIsSuccess(true)
      setMessage('Письмо для сброса пароля отправлено! Проверьте вашу почту.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--primary-text)' }}>
          Восстановление пароля
        </h1>
        <p className="text-sm text-center opacity-70 mb-6">
          Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
        </p>

        {message && (
          <div className={`mb-6 p-3 text-sm text-center rounded-lg font-medium ${isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {!isSuccess && (
          <form onSubmit={handleReset} className="space-y-5">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
            </button>
          </form>
        )}

        <div className="text-center text-sm mt-6">
          <Link href="/login" className="font-medium transition-colors hover:opacity-80" style={{ color: 'var(--primary-color)' }}>
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  )
}