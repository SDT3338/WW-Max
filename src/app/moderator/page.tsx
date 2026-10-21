'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Event = {
  id: string
  title: string
  description: string
  location: string
  event_date: string
  status: string
  profiles: {
    display_name: string
    username: string
  }
}

export default function ModeratorPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'moderator' && profile?.role !== 'admin') {
        router.push('/feed')
        return
      }

      fetchEvents()
    }

    checkRoleAndFetch()
  }, [router])

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, title, description, location, event_date, status,
        profiles (display_name, username)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else if (data) {
      setEvents(data as any)
    }
    setLoading(false)
  }

  const handleModerate = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Панель модератора</h1>
            <p className="text-sm opacity-70 mt-1">Проверка новых заявок</p>
          </div>
          <Link 
            href="/feed"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
          >
            Вернуться в ленту
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-10 rounded-2xl shadow-sm border text-center opacity-70" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              Нет новостей, ожидающих проверки.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">{event.title}</h2>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--primary-color)' }}>
                    Автор: {event.profiles?.display_name || event.profiles?.username || 'Неизвестный'}
                  </p>
                </div>
                
                {event.description && (
                    <p className="mb-4 whitespace-pre-wrap opacity-90">{event.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm p-3 rounded-lg bg-black/5 mb-6">
                  {event.location && <span>Место: {event.location}</span>}
                  {event.event_date && (
                    <span>
                      Время: {new Date(event.event_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleModerate(event.id, 'approved')}
                    className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => handleModerate(event.id, 'rejected')}
                    className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}