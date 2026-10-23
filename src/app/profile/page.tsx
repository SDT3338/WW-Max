'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'

const ProfileSkeleton = () => (
  <div className="min-h-screen p-4 md:p-8 flex flex-col items-center gap-6">
    <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl border animate-pulse-slow" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
      
      <div className="flex items-center gap-5 mb-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-5"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  </div>
)

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('user')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const [subscriptions, setSubscriptions] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      
      setUser(session.user)

      const { data } = await supabase
        .from('profiles')
        .select('username, display_name, bio, role, avatar_url')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setUsername(data.username || '')
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
        setRole(data.role || 'user')
        setAvatarUrl(data.avatar_url || '')
      }

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('following_id')
        .eq('follower_id', session.user.id)
      
      if (subs && subs.length > 0) {
        const followingIds = subs.map(s => s.following_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', followingIds)
        
        if (profilesData) {
          const formattedSubs = profilesData.map(p => ({
            following_id: p.id,
            profiles: p
          }))
          setSubscriptions(formattedSubs)
        }
      }
      
      setLoading(false)
    }
    getProfile()
  }, [router])

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return
    setUploading(true)

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}-${Math.random()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('events')
      .upload(filePath, avatarFile)

    if (uploadError) {setMessage('Ошибка загрузки фото: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('events').getPublicUrl(filePath)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      setMessage('Ошибка обновления профиля: ' + updateError.message)
    } else {
      setAvatarUrl(data.publicUrl)
      setMessage('Фото профиля обновлено!')
    }
    setUploading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setSaving(true)
    setMessage('')

    if (avatarFile) {
      await uploadAvatar()
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        display_name: displayName,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setMessage('Ошибка при сохранении: ' + error.message)
    } else {
      setMessage('Профиль успешно обновлен!')
    }
    setAvatarFile(null)
    setSaving(false)
  }

  const handleUnsubscribe = async (followingId: string) => {
    if (!user) return
    
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .match({ follower_id: user.id, following_id: followingId })

    if (!error) {
      setSubscriptions(subscriptions.filter(s => s.following_id !== followingId))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <ProfileSkeleton />

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center gap-6">
      <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Мой профиль</h1>
            <p className="text-sm opacity-70 mt-1">Управляйте своей личной страницей</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/feed"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
            >
              В ленту
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-3 text-sm rounded-lg font-medium ${message.includes('Ошибка') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSave} className="space-y-5">
          
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 rounded-full border overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center" style={{ borderColor: 'var(--card-border)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Аватар" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs opacity-50">Нет фото</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Фото профиля</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}className="block w-full text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium hover:file:opacity-80 transition-colors"
                style={{ color: 'var(--text-color)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1">Username (ник)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Отображаемое имя</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">О себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-1 resize-none"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {saving || uploading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm" style={{ borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <span className="font-medium opacity-70">Статус:</span>
            <span className="px-2.5 py-1 text-xs font-bold rounded-md uppercase tracking-wider" 
                  style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>
              {role === 'moderator' ? 'Модератор' : role === 'admin' ? 'Администратор' : 'Студент'}
            </span>
          </div>
          <span className="text-xs opacity-50">Вы вошли как: {user?.email}</span>
        </div>
      </div>

      <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--primary-text)' }}>Мои подписки</h2>
        
        {subscriptions.length === 0 ? (
          <p className="text-sm opacity-50">Вы пока ни на кого не подписаны.</p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.following_id} className="flex items-center justify-between p-3 rounded-xl border bg-black/5" style={{ borderColor: 'var(--card-border)' }}><Link href={`/u/profile?id=${sub.profiles.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {sub.profiles.avatar_url ? (
                      <img src={sub.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {sub.profiles.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{sub.profiles.display_name || sub.profiles.username}</p>
                    <p className="text-xs opacity-50">@{sub.profiles.username}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleUnsubscribe(sub.following_id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Отписаться
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}