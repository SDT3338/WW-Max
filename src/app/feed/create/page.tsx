'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateEventPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [files, setFiles] = useState<File[]>([])
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
    })
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    
    if (selectedFiles.length > 3) {
      setMessage('Можно загрузить не более 3 файлов')
      return
    }

    const tooBig = selectedFiles.find(f => f.size > 2 * 1024 * 1024)
    if (tooBig) {
      setMessage('Размер файла не должен превышать 2 МБ')
      return
    }

    setFiles(selectedFiles)
    setMessage('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setLoading(true)
    setMessage('')

    const uploadedUrls: string[] = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file)

      if (uploadError) {
        setMessage('Ошибка загрузки файла: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data } = supabase.storage.from('events').getPublicUrl(filePath)
      uploadedUrls.push(data.publicUrl)
    }

    const { error } = await supabase
      .from('events')
      .insert({
        author_id: session.user.id,
        title,
        description,
        location,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        status: 'pending',
        image_urls: uploadedUrls
      })

    if (error) {
      setMessage('Ошибка: ' + error.message)
      setLoading(false)
    } else {
      // Отправляем уведомление всем модераторам и админам
      const { data: mods } = await supabase.from('profiles').select('id').in('role', ['moderator', 'admin'])
      if (mods && mods.length > 0) {
        const notifications = mods.map(m => ({
          user_id: m.id,
          content: `Новая новость "${title}" ожидает проверки.`
        }))
        await supabase.from('notifications').insert(notifications)
      }
      router.push('/feed')
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Новое мероприятие</h1>
            <p className="text-sm opacity-70 mt-1">Поделитесь новостью со студентами</p>
          </div>
          <Link
            href="/feed"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
          >
            Назад в ленту
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-3 text-sm rounded-lg font-medium bg-red-50 text-red-800">
            {message}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium">Заголовок</label>
              <span className="text-xs opacity-50">{title.length}/100</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={100}
              placeholder="Например: Встреча IT-клуба"
              className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium">Описание</label>
              <span className="text-xs opacity-50">{description.length}/1000</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
              minLength={10}
              maxLength={1000}
              placeholder="Расскажите подробности..."
              className="block w-full rounded-lg border px-4 py-3 shadow-sm focus:outline-none focus:ring-1 resize-none"
              style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-1">Место проведения</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Аудитория, корпус..."
                className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Дата и время</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="block w-full rounded-lg border px-4 py-2.5 shadow-sm focus:outline-none focus:ring-1"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Фотографии (до 3 штук, макс. 2 МБ каждая)</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium hover:file:opacity-80 transition-colors"
              style={{ color: 'var(--text-color)' }}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loading ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}