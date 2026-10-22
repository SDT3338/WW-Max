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
  image_urls?: string[]
  moderator_id?: string | null
  profiles: {
    display_name: string
    username: string
  }
  moderator?: {
    display_name: string
    username: string
  } | null
}

export default function ModeratorPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  
  // Состояния для модальных окон
  const [actionModal, setActionModal] = useState<{ id: string, type: 'reject' | 'revision' } | null>(null)
  const [reasonText, setReasonText] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    const checkRoleAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setCurrentUserId(session.user.id)

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
        id, title, description, location, event_date, status, image_urls, moderator_id,
        profiles!events_author_id_fkey (display_name, username),
        moderator:profiles!events_moderator_id_fkey (display_name, username)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else if (data) setEvents(data as any)
    
    setLoading(false)
  }

  const takeTask = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ moderator_id: currentUserId })
      .eq('id', id)

    if (error) alert('Не удалось взять заявку: ' + error.message)
    else fetchEvents()
  }

  const releaseTask = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ moderator_id: null })
      .eq('id', id)

    if (!error) fetchEvents()
  }

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'approved', rejection_reason: null, revision_comment: null })
      .eq('id', id)

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      const { data: event } = await supabase.from('events').select('author_id, title').eq('id', id).single()
      if (event) {
        await supabase.from('notifications').insert({
          user_id: event.author_id,
          content: `Ваша новость "${event.title}" была одобрена!`
        })
      }
      setEvents(events.filter(e => e.id !== id))
    }
  }

  const handleActionSubmit = async () => {
    if (!actionModal) return
    if (!reasonText.trim()) {
      alert('Пожалуйста, укажите причину')
      return
    }

    const isReject = actionModal.type === 'reject'
    const updateData = isReject 
      ? { status: 'rejected', rejection_reason: reasonText, revision_comment: null }
      : { status: 'revision', revision_comment: reasonText, rejection_reason: null }

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', actionModal.id)

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      const { data: event } = await supabase.from('events').select('author_id, title').eq('id', actionModal.id).single()
      if (event) {
        const notifText = isReject 
          ? `Ваша новость "${event.title}" отклонена. Причина: ${reasonText}`
          : `Ваша новость "${event.title}" отправлена на доработку. Комментарий: ${reasonText}`
          
        await supabase.from('notifications').insert({
          user_id: event.author_id,
          content: notifText
        })
      }
      setEvents(events.filter(e => e.id !== actionModal.id))
      setActionModal(null)
      setReasonText('')
    }
  }

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Панель модератора</h1>
            <p className="text-sm opacity-70 mt-1">Проверка новых заявок</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchEvents} className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
              Обновить
            </button>
            <Link href="/feed" className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              В ленту
            </Link>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>}

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="p-10 rounded-2xl shadow-sm border text-center opacity-70" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              Нет новостей, ожидающих проверки.
            </div>
          ) : (
            events.map((event) => {
              const isLockedByMe = event.moderator_id === currentUserId
              const isLockedByOther = event.moderator_id && event.moderator_id !== currentUserId

              return (
                <div key={event.id} className="p-6 rounded-2xl shadow-sm border relative overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                  
                  {isLockedByOther && (
                    <div className="absolute top-0 left-0 w-full bg-gray-100 text-gray-600 px-6 py-1.5 text-xs font-bold text-center border-b" style={{ borderColor: 'var(--card-border)' }}>
                      В работе у модератора: {event.moderator?.display_name || event.moderator?.username}
                    </div>
                  )}
                  {isLockedByMe && (
                    <div className="absolute top-0 left-0 w-full bg-purple-100 text-purple-800 px-6 py-1.5 text-xs font-bold text-center border-b" style={{ borderColor: 'var(--card-border)' }}>
                      Вы взяли эту заявку в работу
                    </div>
                  )}

                  <div className={`mb-4 ${event.moderator_id ? 'mt-6' : ''}`}>
                    <h2 className="text-xl font-bold">{event.title}</h2>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--primary-color)' }}>
                      Автор: {event.profiles?.display_name || event.profiles?.username || 'Неизвестный'}
                    </p>
                  </div>
                  
                  {event.description && <p className="mb-4 whitespace-pre-wrap opacity-90">{event.description}</p>}

                  {event.image_urls && event.image_urls.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                      {event.image_urls.map((url, index) => (
                        <img key={index} src={url} alt="Фото" className="h-48 w-auto object-cover rounded-xl border" style={{ borderColor: 'var(--card-border)' }} />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm p-3 rounded-lg bg-black/5 mb-6">
                    {event.location && <span>Место: {event.location}</span>}
                    {event.event_date && (
                      <span>Время: {new Date(event.event_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    )}
                  </div>

                  {isLockedByOther ? (
                    <button disabled className="px-5 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                      Занято другим модератором
                    </button>
                  ) : isLockedByMe ? (
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => handleApprove(event.id)} className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                        Одобрить
                      </button>
                      <button onClick={() => setActionModal({ id: event.id, type: 'revision' })} className="px-5 py-2 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm">
                        На доработку
                      </button>
                      <button onClick={() => setActionModal({ id: event.id, type: 'reject' })} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                        Отклонить
                      </button>
                      <button onClick={() => releaseTask(event.id)} className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                        Вернуть в очередь
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => takeTask(event.id)} className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
                      Взять в работу
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Модальное окно для отклонения / доработки */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 rounded-2xl shadow-xl border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-color)' }}>
              {actionModal.type === 'reject' ? 'Причина отклонения' : 'Что нужно доработать?'}
            </h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={4}
              placeholder={actionModal.type === 'reject' ? "Например: Недостоверная информация..." : "Например: Добавьте больше деталей и исправьте опечатки..."}
              className="w-full rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-1 resize-none mb-4"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
            <div className="flex justify-end gap-3"><button onClick={() => { setActionModal(null); setReasonText('') }} className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
                Отмена
              </button>
              <button onClick={handleActionSubmit} className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm" style={{ backgroundColor: actionModal.type === 'reject' ? '#dc2626' : '#eab308' }}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}