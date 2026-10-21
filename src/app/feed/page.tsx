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
  created_at: string
  image_urls?: string[]
  profiles: {
    display_name: string
    username: string
    avatar_url: string | null
  }
  reactions: { user_id: string }[]
}

export default function FeedPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [userRole, setUserRole] = useState<string>('user')
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile) setUserRole(profile.role)

      const { data } = await supabase
        .from('events')
        .select(`
          id, title, description, location, event_date, created_at, image_urls,
          profiles (display_name, username, avatar_url),
          reactions (user_id)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (data) setEvents(data as any)
      setLoading(false)
    }
    init()
  }, [router])

  const toggleReaction = async (eventId: string, hasReacted: boolean) => {
    if (hasReacted) {
      await supabase.from('reactions').delete().match({ event_id: eventId, user_id: userId })
    } else {
      await supabase.from('reactions').insert({ event_id: eventId, user_id: userId })
    }
    
    const { data } = await supabase
      .from('events')
      .select(`
        id, title, description, location, event_date, created_at, image_urls,
        profiles (display_name, username, avatar_url),
        reactions (user_id)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      
    if (data) setEvents(data as any)
  }

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center p-6 rounded-2xl shadow-sm border gap-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Лента новостей</h1>
            <p className="text-sm opacity-70">Студенческие мероприятия и анонсы</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {(userRole === 'moderator' || userRole === 'admin') && (
              <Link href="/moderator" className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                Модерация
              </Link>
            )}
            
            <Link href="/profile" className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              Профиль
            </Link>
            
            <Link href="/feed/create" className="px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors" style={{ backgroundColor: 'var(--primary-color)' }}>
              Создать
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-10 rounded-2xl shadow-sm border text-center opacity-70" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              Пока нет ни одной новости.
            </div>
          ) : (
            events.map((event) => {
              const hasReacted = event.reactions?.some(r => r.user_id === userId)
              const reactionCount = event.reactions?.length || 0

              return (
                <div key={event.id} className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {event.profiles?.avatar_url ? (
                          <img src={event.profiles.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-200">
                            {event.profiles?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold leading-tight">{event.title}</h2>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--primary-color)' }}>
                          {event.profiles?.display_name || event.profiles?.username || 'Неизвестный'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs opacity-50 whitespace-nowrap ml-4">
                      {new Date(event.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="mb-4 whitespace-pre-wrap opacity-90">{event.description}</p>
                  )}

                  {event.image_urls && event.image_urls.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {event.image_urls.map((url, index) => (
                        <img 
                          key={index} 
                          src={url} 
                          alt="Фото мероприятия" 
                          className="h-48 w-auto object-cover rounded-xl border"
                          style={{ borderColor: 'var(--card-border)' }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm p-3 rounded-lg bg-black/5 mb-4">
                    {event.location && <span>Место: {event.location}</span>}
                    {event.event_date && (
                      <span>
                        Время: {new Date(event.event_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => toggleReaction(event.id, !!hasReacted)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${hasReacted ? 'bg-red-50 text-red-600 border-red-200' : 'hover:bg-black/5'}`}
                      style={{ borderColor: hasReacted ? undefined : 'var(--card-border)' }}
                    >
                      <span>{hasReacted ? '❤️' : '🤍'}</span>
                      <span>{reactionCount > 0 ? reactionCount : 'Нравится'}</span>
                    </button>
                  </div>
                </div>
                )
            })
          )}
        </div>
      </div>
    </div>
  )
}