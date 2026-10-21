'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type UserProfile = {
  id: string
  username: string
  display_name: string
  role: string
  avatar_url: string | null
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (myProfile?.role !== 'admin') {
        router.push('/feed')
        return
      }
      setMyRole(myProfile.role)
      fetchUsers()
    }

    checkAdminAndFetch()
  }, [router])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, avatar_url')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert('Ошибка: ' + error.message)
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Управление пользователями</h1>
            <p className="text-sm opacity-70 mt-1">Назначение ролей и модерация</p>
          </div>
          <Link 
            href="/feed"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
          >
            Вернуться в ленту
          </Link>
        </div>

        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <input
            type="text"
            placeholder="Поиск по нику или имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1 mb-6"
            style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
          />

          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {user.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{user.display_name || user.username}</p>
                    <p className="text-xs opacity-50">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm font-medium focus:outline-none cursor-pointer"
                    style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}
                  >
                    <option value="user">Студент</option>
                    <option value="moderator">Модератор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center opacity-50 py-4">Пользователи не найдены.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}