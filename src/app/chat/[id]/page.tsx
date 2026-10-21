'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

type Message = {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
}

export default function PrivateChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', otherId)
        .single()
      
      if (profileError) {
        console.error("Ошибка загрузки профиля:", profileError)
      } else {
        setOtherUser(profile)
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true })

      if (error) console.error("Ошибка загрузки сообщений:", error)
      if (data) setMessages(data)
      
      setLoading(false)
      scrollToBottom()

      const channel = supabase
        .channel('private_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new as Message
          if (
            (newMsg.sender_id === session.user.id && newMsg.receiver_id === otherId) ||
            (newMsg.sender_id === otherId && newMsg.receiver_id === session.user.id)
          ) {
            setMessages((prev) => [...prev, newMsg])
            scrollToBottom()
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    init()
  }, [router, otherId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const content = newMessage
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content: content
    })

    if (error) {
      console.error("Ошибка отправки:", error)
      alert("Ошибка при отправке: " + error.message)
    }
  }

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex-1 flex flex-col h-[85vh] rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-3">
            <Link href="/chat" className="text-sm font-medium opacity-50 hover:opacity-100 transition-opacity mr-2">
              &larr; Назад
            </Link>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                  {otherUser?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--primary-text)' }}>
                {otherUser?.display_name || otherUser?.username || 'Пользователь'}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center opacity-50 mt-10">История сообщений пуста. Напишите первым!</div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'rounded-tr-sm text-white' : 'rounded-tl-sm bg-black/5'}`} 
                       style={{ backgroundColor: isMe ? 'var(--primary-color)' : undefined, color: isMe ? 'white' : 'var(--text-color)' }}>
                    {msg.content}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-white font-medium transition-colors shadow-sm"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Отправить
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}