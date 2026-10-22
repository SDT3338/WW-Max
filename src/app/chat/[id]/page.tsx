'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

type Message = {
  id: string
  content: string
  image_url?: string | null
  created_at: string
  sender_id: string
  receiver_id: string
}

const EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '🔥', '❤️', '👍', '👎', '👏', '🎉', '💩']

export default function PrivateChatPage() {
  const router = useRouter()
  const params = useParams()
  const otherId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Заметки
  const [contactNote, setContactNote] = useState('')
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [tempNote, setTempNote] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // 1. Загружаем профиль собеседника
      const { data: profile } = await supabase.from('profiles').select('username, display_name, avatar_url').eq('id', otherId).single()
      if (profile) setOtherUser(profile)

      // 2. Загружаем ЛИЧНУЮ ЗАМЕТКУ из новой таблицы contacts
      const { data: contactData } = await supabase
        .from('contacts')
        .select('custom_name')
        .match({ owner_id: session.user.id, contact_id: otherId })
        .single()
      
      if (contactData?.custom_name) {
        setContactNote(contactData.custom_name)
        setTempNote(contactData.custom_name)
      }

      // 3. Загружаем сообщения
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
      
      setLoading(false)
      scrollToBottom()

      // 4. Подписка на новые сообщения
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

      return () => { supabase.removeChannel(channel) }
    }
    init()
  }, [router, otherId])

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
  }

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojis(false)
  }

  const handleSaveNote = async () => {
    if (!user) return
    
    // Сохраняем или обновляем заметку в таблице contacts
    const { error } = await supabase
      .from('contacts')
      .upsert({ 
        owner_id: user.id, 
        contact_id: otherId, 
        custom_name: tempNote 
      }, { 
        onConflict: 'owner_id,contact_id' 
      })
    
    if (!error) {
      setContactNote(tempNote)
      setIsEditingNote(false)
    } else {alert('Ошибка при сохранении: ' + error.message)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !imageFile) || !user) return

    setSending(true)
    let uploadedImageUrl = null

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `chat/${fileName}`

      const { error: uploadError } = await supabase.storage.from('events').upload(filePath, imageFile)
      
      if (!uploadError) {
        const { data } = supabase.storage.from('events').getPublicUrl(filePath)
        uploadedImageUrl = data.publicUrl
      }
    }

    const content = newMessage
    setNewMessage('')
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    // Отправляем сообщение (БЕЗ поля contact_note, оно нам больше не нужно в сообщениях)
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content: content || '',
      image_url: uploadedImageUrl
    })

    if (!error) {
      const { data: myProfile } = await supabase.from('profiles').select('username, display_name').eq('id', user.id).single()
      const senderName = myProfile?.display_name || myProfile?.username || 'Пользователь'
      const notifText = content ? `Новое сообщение от ${senderName}: "${content}"` : `Новое фото от ${senderName}`
      
      await supabase.from('notifications').insert({ user_id: otherId, content: notifText })
    }
    
    setSending(false)
  }

  // Группировка по датам
  const groupedMessages = messages.reduce((groups: any, message) => {
    const date = new Date(message.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {})

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen md:p-8 items-center bg-[var(--bg-color)]">
      <div className="w-full max-w-3xl flex-1 flex flex-col md:rounded-2xl md:shadow-sm md:border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        
        {/* Шапка */}
        <div className="p-3 md:p-4 border-b flex justify-between items-center bg-[var(--card-bg)] z-10" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/chat" className="p-1 md:p-2 -ml-1 text-lg opacity-50 hover:opacity-100 transition-opacity">
              &larr;
            </Link>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                  {otherUser?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-bold leading-tight flex items-center gap-2" style={{ color: 'var(--primary-text)' }}>
                {contactNote || otherUser?.display_name || otherUser?.username}
                <button onClick={() => setIsEditingNote(!isEditingNote)} className="text-sm opacity-40 hover:opacity-100">✎</button>
              </h1>
              {contactNote && <span className="text-xs opacity-50">@{otherUser?.username}</span>}
            </div>
          </div>
        </div>

        {/* Поле для заметки */}
        {isEditingNote && (<div className="p-3 border-b flex gap-2" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)' }}>
            <input 
              type="text" 
              value={tempNote} 
              onChange={e => setTempNote(e.target.value)} 
              placeholder="Личная заметка (имя)..."
              className="flex-1 rounded border px-3 py-1 text-sm bg-transparent"
              style={{ borderColor: 'var(--card-border)' }}
            />
            <button onClick={handleSaveNote} className="px-3 py-1 text-xs text-white rounded" style={{ backgroundColor: 'var(--primary-color)' }}>Сохранить</button>
          </div>
        )}

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 bg-[var(--bg-color)]">
          {Object.keys(groupedMessages).map(date => (
            <div key={date}>
              <div className="text-center text-xs font-bold opacity-40 my-4 uppercase">{date}</div>
              {groupedMessages[date].map((msg: Message) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex flex-col mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] p-2.5 md:p-3 rounded-2xl text-sm md:text-base ${isMe ? 'rounded-tr-sm text-white' : 'rounded-tl-sm bg-[var(--card-bg)] shadow-sm'}`} 
                        style={{ backgroundColor: isMe ? 'var(--primary-color)' : undefined, color: isMe ? 'white' : 'var(--text-color)' }}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="Вложение" className="max-w-full rounded-lg mb-1.5 md:mb-2" />
                      )}
                      {msg.content && <p className="break-words">{msg.content}</p>}
                      
                      <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'opacity-50'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Эмодзи */}
        {showEmojis && (
          <div className="absolute bottom-[70px] left-2 md:left-4 p-2 rounded-xl shadow-lg border flex gap-1 flex-wrap max-w-[260px] md:max-w-xs z-20" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => addEmoji(e)} className="text-2xl hover:scale-125 transition-transform p-1">
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Ввод */}
        <div className="p-2 md:p-4 border-t bg-[var(--card-bg)] pb-safe" style={{ borderColor: 'var(--card-border)' }}>
          {imageFile && (
            <div className="mb-2 text-xs font-medium px-2 flex justify-between items-center" style={{ color: 'var(--primary-color)' }}>
              <span className="truncate max-w-[80%]">Выбрано: {imageFile.name}</span>
              <button type="button" onClick={() => setImageFile(null)} className="text-red-500 font-bold px-2">✕</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-1.5 md:gap-2 items-end">
            <div className="flex gap-1 md:gap-2 pb-1">
              <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">
                😊
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">
                📎
              </button><input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
            </div>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Сообщение..."
              className="flex-1 min-w-0 rounded-2xl border px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
            
            <button type="submit" disabled={sending} className="px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-white text-sm md:text-base font-medium transition-colors shadow-sm disabled:opacity-50 mb-0.5" style={{ backgroundColor: 'var(--primary-color)' }}>
              {sending ? '...' : <span className="hidden md:inline">Отправить</span>}
              {sending ? '' : <span className="md:hidden">➤</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}