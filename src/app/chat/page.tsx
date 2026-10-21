'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

type Dialog = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  sender: { username: string, display_name: string, avatar_url: string }
  receiver: { username: string, display_name: string, avatar_url: string }
}

export default function ChatListPage() {
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchDialogs = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // Получаем все сообщения, где ты отправитель или получатель
      const { data } = await supabase
        .from('messages')
        .select(`
          id, sender_id, receiver_id, content, created_at,
          sender:profiles!messages_sender_id_fkey(username, display_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (data) {
        // Группируем сообщения по собеседникам (чтобы показать последнее сообщение с каждым)
        const uniqueDialogs = new Map()
        data.forEach((msg: any) => {
          const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id
          if (!uniqueDialogs.has(otherId)) {
            uniqueDialogs.set(otherId, {
              ...msg,
              otherUser: msg.sender_id === session.user.id ? msg.receiver : msg.sender,
              otherId: otherId
            })
          }
        })
        setDialogs(Array.from(uniqueDialogs.values()))
      }
      setLoading(false)
    }
    fetchDialogs()
  }, [router])

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--primary-text)' }}>Сообщения</h1>
            <p className="text-sm opacity-70">Ваши личные переписки</p>
          </div>
          <Link href="/feed" className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
            В ленту
          </Link>
        </div>

        <div className="p-4 space-y-2">
          {dialogs.length === 0 ? (
            <div className="text-center opacity-50 py-10">У вас пока нет сообщений. Найдите автора в ленте и нажмите «Написать».</div>
          ) : (
            dialogs.map((dialog: any) => (
              <div 
                key={dialog.id} 
                onClick={() => router.push(`/chat/${dialog.otherId}`)}
                className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:opacity-80 transition-colors"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)' }}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {dialog.otherUser?.avatar_url ? (
                    <img src={dialog.otherUser.avatar_url} alt="Аватар" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                      {dialog.otherUser?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold truncate">{dialog.otherUser?.display_name || dialog.otherUser?.username}</h3>
                    <span className="text-xs opacity-50">{new Date(dialog.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <p className="text-sm opacity-70 truncate">{dialog.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}