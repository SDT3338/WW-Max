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
  otherUser: { id: string, username: string, display_name: string, avatar_url: string }
}

type GlobalUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string
}

const ChatListSkeleton = () => (
  <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
    <div className="w-full max-w-3xl rounded-2xl border animate-pulse-slow" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--card-border)' }}>
        <div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
      <div className="p-4 space-y-4">
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--card-border)' }}>
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default function ChatListPage() {
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([])
  const [contacts, setContacts] = useState<Record<string, string>>({})
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          id, sender_id, receiver_id, content, created_at,
          sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (messagesData) {
        const uniqueDialogs = new Map()
        messagesData.forEach((msg: any) => {
          const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id
          if (!uniqueDialogs.has(otherId)) {
            uniqueDialogs.set(otherId, {
              id: msg.id,
              sender_id: msg.sender_id,
              receiver_id: msg.receiver_id,
              content: msg.content,
              created_at: msg.created_at,
              otherUser: msg.sender_id === session.user.id ? msg.receiver : msg.sender,
            })
          }
        })
        setDialogs(Array.from(uniqueDialogs.values()) as Dialog[])
      }

      const { data: contactsData } = await supabase
        .from('contacts')
        .select('contact_id, custom_name')
        .eq('owner_id', session.user.id)
      
      if (contactsData) {
        const contactsMap: Record<string, string> = {}
        contactsData.forEach(c => {if (c.custom_name) contactsMap[c.contact_id] = c.custom_name
        })
        setContacts(contactsMap)
      }

      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', session.user.id)

      if (usersData) setGlobalUsers(usersData)

      setLoading(false)
    }
    fetchData()
  }, [router])

  const isSearching = searchQuery.length > 0
  const filteredDialogs = isSearching ? [] : dialogs
  
  const filteredGlobalUsers = isSearching
    ? globalUsers.filter(u => {
        const query = searchQuery.toLowerCase()
        const realName = (u.display_name || '').toLowerCase()
        const username = (u.username || '').toLowerCase()
        const customName = (contacts[u.id] || '').toLowerCase() 
        
        return realName.includes(query) || username.includes(query) || customName.includes(query)
      })
    : []

  if (loading) return <ChatListSkeleton />

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--primary-text)' }}>Сообщения</h1>
            <p className="text-sm opacity-70">Ваши переписки и поиск людей</p>
          </div>
          <Link href="/feed" className="px-4 py-2 text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
            В ленту
          </Link>
        </div>

        <div className="p-4 space-y-2">
          <input
            type="text"
            placeholder="Поиск по имени или нику..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1 mb-4"
            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
          />

          {isSearching && (
            <div className="mb-6">
              <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider mb-2 px-2">Глобальный поиск</h3>
              {filteredGlobalUsers.length === 0 ? (
                <div className="text-sm opacity-50 px-2">Пользователи не найдены.</div>
              ) : (
                filteredGlobalUsers.map(gu => {
                  const customName = contacts[gu.id]
                  return (
                    <div key={gu.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          {gu.avatar_url ? (
                            <img src={gu.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                              {gu.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            {customName || gu.display_name || gu.username}
                          </p>
                          <p className="text-xs opacity-50">@{gu.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push(`/chat/${gu.id}`)}className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        Написать
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {!isSearching && (
            <div>
              <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider mb-2 px-2">Мои чаты</h3>
              {filteredDialogs.length === 0 ? (
                <div className="text-center opacity-50 py-10">
                  У вас пока нет сообщений. Введите имя в поиск, чтобы найти собеседника.
                </div>
              ) : (
                filteredDialogs.map((dialog) => {
                  const customName = contacts[dialog.otherUser.id]
                  return (
                    <div 
                      key={dialog.id} 
                      onClick={() => router.push(`/chat/${dialog.otherUser.id}`)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-[var(--card-border)] hover:bg-black/5 cursor-pointer transition-all"
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
                          <h3 className="font-bold truncate">
                            {customName || dialog.otherUser?.display_name || dialog.otherUser?.username}
                          </h3>
                          <span className="text-xs opacity-50">{new Date(dialog.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <p className="text-sm opacity-70 truncate">{dialog.content || 'Фото'}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}