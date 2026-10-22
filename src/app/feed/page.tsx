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
  status: string
  rejection_reason?: string | null
  revision_comment?: string | null
  moderator_id?: string | null
  author: {
    id: string
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

  // Состояния для поиска и фильтров
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

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
          id, title, description, location, event_date, created_at, image_urls, status, rejection_reason, revision_comment, moderator_id,
          author:profiles!events_author_id_fkey (id, display_name, username, avatar_url),
          reactions (user_id)
        `)
        .or(`status.eq.approved,author_id.eq.${session.user.id}`)
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
        id, title, description, location, event_date, created_at, image_urls, status, rejection_reason, revision_comment, moderator_id,
        author:profiles!events_author_id_fkey (id, display_name, username, avatar_url),
        reactions (user_id)
      `)
      .or(`status.eq.approved,author_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      
    if (data) setEvents(data as any)
  }

  // Логика фильтрации и сортировки
  const filteredEvents = events
    .filter(event => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.author?.display_name?.toLowerCase().includes(query) ||
        event.author?.username?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Шапка */}
        <div className="flex flex-col md:flex-row justify-between items-center p-4 md:p-6 rounded-2xl shadow-sm border gap-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}><Link href="/" className="flex flex-col items-center md:items-start w-full md:w-auto mb-2 md:mb-0">
            <span className="text-xl font-black tracking-tighter flex items-center gap-1 mb-1">
              <span style={{ color: 'var(--primary-color)' }}>WW</span>
              <span style={{ color: 'var(--text-color)' }}>-Max</span>
            </span>
            <p className="text-xs md:text-sm opacity-70">Лента новостей</p>
          </Link>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 md:gap-3 w-full">
            {userRole === 'admin' && (
              <Link href="/admin" className="px-3 py-1.5 text-xs md:text-sm md:px-4 md:py-2 font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                Админка
              </Link>
            )}

            {(userRole === 'moderator' || userRole === 'admin') && (
              <Link href="/moderator" className="px-3 py-1.5 text-xs md:text-sm md:px-4 md:py-2 font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                Модерация
              </Link>
            )}
            
            <Link href="/chat" className="px-3 py-1.5 text-xs md:text-sm md:px-4 md:py-2 font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
              Сообщения
            </Link>

            <Link href="/profile" className="px-3 py-1.5 text-xs md:text-sm md:px-4 md:py-2 font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              Профиль
            </Link>
            
            <Link href="/feed/create" className="px-4 py-1.5 text-xs md:text-sm md:px-5 md:py-2 font-medium text-white rounded-lg shadow-sm transition-colors" style={{ backgroundColor: 'var(--primary-color)' }}>
              Создать
            </Link>
          </div>
        </div>

        {/* Панель поиска и фильтров */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-color)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по заголовку, тексту или автору..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border pl-10 pr-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="rounded-lg border px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 cursor-pointer"
            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
          </select>
        </div>

        {/* Лента */}
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (<div className="p-10 rounded-2xl shadow-sm border text-center opacity-70" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              Ничего не найдено по вашему запросу.
            </div>
          ) : (
            filteredEvents.map((event) => {
              const hasReacted = event.reactions?.some(r => r.user_id === userId)
              const reactionCount = event.reactions?.length || 0
              const isMyEvent = event.author?.id === userId

              return (
                <div key={event.id} className="p-4 md:p-6 rounded-2xl shadow-sm border relative overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                  
                  {isMyEvent && event.status !== 'approved' && (
                    <div className={`absolute top-0 left-0 w-full px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-bold ${
                      event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      event.status === 'revision' ? 'bg-orange-100 text-orange-800' :
                      event.status === 'rejected' ? 'bg-red-100 text-red-800' : ''
                    }`}>
                      <span>
                        {event.status === 'pending' && (event.moderator_id ? 'Взято на рассмотрение модератором' : 'На модерации')}
                        {event.status === 'revision' && `На доработке: ${event.revision_comment || 'Без комментария'}`}
                        {event.status === 'rejected' && `Отклонено: ${event.rejection_reason || 'Без причины'}`}
                      </span>
                      
                      {event.status === 'revision' && (
                        <Link 
                          href={`/feed/edit?id=${event.id}`}
                          className="mt-2 sm:mt-0 px-3 py-1 bg-white/50 hover:bg-white rounded text-black transition-colors whitespace-nowrap"
                        >
                          Исправить
                        </Link>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col sm:flex-row justify-between items-start mb-4 gap-2 ${isMyEvent && event.status !== 'approved' ? 'mt-12' : ''}`}>
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {event.author?.avatar_url ? (
                          <img src={event.author.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 bg-gray-200">
                            {event.author?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold leading-tight break-words">{event.title}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <Link href={`/u/profile?id=${event.author?.id}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--primary-color)' }}>
                            {event.author?.display_name || event.author?.username || 'Неизвестный'}
                          </Link>
                          {!isMyEvent && (
                            <button 
                              onClick={() => router.push(`/chat/${event.author?.id}`)}
                              className="text-xs font-medium px-2 py-0.5 rounded border hover:opacity-80 transition-colors"
                              style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                              Написать
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs opacity-50 whitespace-nowrap sm:ml-4">
                      {new Date(event.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="mb-4 whitespace-pre-wrap opacity-90 text-sm md:text-base">{event.description}</p>
                  )}

                  {event.image_urls && event.image_urls.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {event.image_urls.map((url, index) => (
                        <img 
                          key={index} 
                          src={url} 
                          alt="Фото мероприятия" 
                          className="h-40 md:h-48 w-auto object-cover rounded-xl border"
                          style={{ borderColor: 'var(--card-border)' }}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm p-3 rounded-lg bg-black/5 mb-4">
                    {event.location && <span>Место: {event.location}</span>}
                    {event.event_date && (
                      <span>
                        Время: {new Date(event.event_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  {event.status === 'approved' && (
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
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}