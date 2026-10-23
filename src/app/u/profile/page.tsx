'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const PublicProfileSkeleton = () => (
  <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
    <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl border text-center animate-pulse-slow mb-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 mb-4"></div>
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4"></div>
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-6"></div>
      <div className="flex justify-center gap-3">
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
    
    <div className="w-full max-w-2xl space-y-4">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 px-2"></div>
      {[1, 2].map(i => (
        <div key={i} className="p-6 rounded-2xl border animate-pulse-slow" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      ))}
    </div>
  </div>
)

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileId = searchParams.get('id')

  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) {
      router.push('/feed')
      return
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setCurrentUserId(session.user.id)

      // Загружаем профиль
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()
      
      if (profileData) setProfile(profileData)

      // Загружаем посты этого пользователя (только одобренные)
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, reactions (user_id)')
        .eq('author_id', profileId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      
      if (eventsData) setEvents(eventsData)

      // Считаем подписчиков
      const { count } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId)
      
      setSubscriberCount(count || 0)

      // Проверяем подписку
      if (session.user.id !== profileId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id')
          .match({ follower_id: session.user.id, following_id: profileId })
          .single()
        
        if (subData) setIsSubscribed(true)
      }

      setLoading(false)
    }
    init()
  }, [router, profileId])

  const toggleSubscription = async () => {
    if (!currentUserId || currentUserId === profileId) return

    if (isSubscribed) {
      await supabase
        .from('subscriptions')
        .delete().match({ follower_id: currentUserId, following_id: profileId })
      setIsSubscribed(false)
      setSubscriberCount(prev => prev - 1)
    } else {
      await supabase
        .from('subscriptions')
        .insert({ follower_id: currentUserId, following_id: profileId })
      setIsSubscribed(true)
      setSubscriberCount(prev => prev + 1)
    }
  }

  if (loading) return <PublicProfileSkeleton />
  if (!profile) return <div className="p-8 text-center text-red-500">Профиль не найден</div>

  const isMe = currentUserId === profileId

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl shadow-sm border text-center mb-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gray-200 mb-4 border-2" style={{ borderColor: 'var(--primary-color)' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-500">
              {profile.username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-1">{profile.display_name || profile.username}</h1>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--primary-color)' }}>@{profile.username}</p>
        
        <div className="text-sm opacity-70 mb-4 font-medium">
          {subscriberCount} подписчиков
        </div>
        
        {profile.bio && (
          <p className="text-sm opacity-80 mb-6 max-w-md mx-auto">{profile.bio}</p>
        )}

        <div className="flex justify-center gap-3 mb-8">
          <Link href="/feed" className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
            В ленту
          </Link>

          {isMe ? (
            <Link href="/profile" className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              Редактировать
            </Link>
          ) : (
            <>
              <button
                onClick={toggleSubscription}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border`}
                style={
                  isSubscribed 
                    ? { backgroundColor: 'transparent', borderColor: 'var(--card-border)', color: 'var(--text-color)' } 
                    : { backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)', color: 'white' }
                }
              >
                {isSubscribed ? 'Отписаться' : 'Подписаться'}
              </button>
              <button 
                onClick={() => router.push(`/chat/${profileId}`)}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:opacity-80 transition-colors"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
              >
                Написать
              </button>
            </>
          )}
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <h2 className="text-xl font-bold px-2" style={{ color: 'var(--text-color)' }}>Новости автора</h2>
        
        {events.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border opacity-70" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            У этого пользователя пока нет новостей.
          </div>
        ) : (
          events.map((event) => (<div key={event.id} className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
              <h3 className="text-lg font-bold mb-2">{event.title}</h3>
              <p className="text-sm opacity-70 mb-4">{new Date(event.created_at).toLocaleDateString('ru-RU')}</p>
              
              {event.description && (
                <p className="text-sm mb-4 whitespace-pre-wrap">{event.description}</p>
              )}

              {event.image_urls && event.image_urls.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {event.image_urls.map((url: string, index: number) => (
                    <img 
                      key={index} 
                      src={url} 
                      alt="Фото мероприятия" 
                      className="h-40 w-auto object-cover rounded-lg border"
                      style={{ borderColor: 'var(--card-border)' }}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs p-2 rounded-lg bg-black/5">
                {event.location && <span>Место: {event.location}</span>}
                {event.event_date && (
                  <span>
                    Время: {new Date(event.event_date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function PublicProfilePage() {
  return (
    <Suspense fallback={<PublicProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}