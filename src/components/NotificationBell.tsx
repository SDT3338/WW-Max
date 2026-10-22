'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUser(session.user)

      fetchNotifications(session.user.id)

      const channel = supabase
        .channel(`notifications-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new as any, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    init()
  }, [])

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  const markAsRead = async () => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0 && user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(0)
    }
  }

  return (
    <div className="relative">
      <button onClick={markAsRead} className="relative p-2 rounded-full border hover:opacity-80 transition-colors" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-color)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" onClick={() => setIsOpen(false)}></div>
          
          <div className="fixed sm:absolute top-16 sm:top-auto left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 sm:mt-2 w-[90vw] sm:w-80 max-w-sm rounded-xl shadow-lg border z-50 overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <div className="p-3 border-b font-bold text-sm flex justify-between items-center" style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
              <span>Уведомления</span>
              <button onClick={() => setIsOpen(false)} className="sm:hidden text-gray-500 hover:text-gray-800 text-lg leading-none">&times;</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-xs opacity-50" style={{ color: 'var(--text-color)' }}>
                  Нет уведомлений
                </div>
              ) : (
                notifications.map(n => {
                  const isMessage = n.content.startsWith('Новое сообщение от') || n.content.startsWith('Новое фото от')
                  
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (isMessage) {
                          setIsOpen(false)
                          router.push('/chat') 
                        }
                      }}
                      className={`p-3 border-b text-sm transition-colors ${n.is_read ? 'opacity-50' : ''} ${isMessage ? 'cursor-pointer hover:bg-black/5' : ''}`} 
                      style={{ borderColor: 'var(--card-border)', color: 'var(--text-color)' }}
                    >
                      {n.content}
                      <div className="text-xs opacity-40 mt-1">
                        {new Date(n.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}