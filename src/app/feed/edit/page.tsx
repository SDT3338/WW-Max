'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function EditEventForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!eventId) {
      router.push('/feed')
      return
    }

    const fetchEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('author_id', session.user.id)
        .single()

      if (error || !data) {
        setMessage('Пост не найден или у вас нет прав на его редактирование.')
        setLoading(false)
        return
      }

      setTitle(data.title || '')
      setDescription(data.description || '')
      setLocation(data.location || '')
      setExistingImages(data.image_urls || [])
      
      if (data.event_date) {
        const date = new Date(data.event_date)
        const formattedDate = date.toISOString().slice(0, 16)
        setEventDate(formattedDate)
      }

      setLoading(false)
    }
    fetchEvent()
  }, [eventId, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    
    if (selectedFiles.length + existingImages.length > 3) {
      setMessage('Можно загрузить не более 3 файлов (включая старые)')
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

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !eventId) return

    setSaving(true)
    setMessage('')

    const uploadedUrls: string[] = []

    // Загружаем новые файлы, если есть
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file)

      if (uploadError) {
        setMessage('Ошибка загрузки файла: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data } = supabase.storage.from('events').getPublicUrl(filePath)
      uploadedUrls.push(data.publicUrl)
    }

    const finalImages = [...existingImages, ...uploadedUrls]

    // Обновляем пост, меняем статус обратно на 'pending' и очищаем комментарий
    const { error } = await supabase
      .from('events')
      .update({
        title,
        description,
        location,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        image_urls: finalImages,
        status: 'pending',
        revision_comment: null, 
        rejection_reason: null
      })
      .eq('id', eventId)

    if (error) {
      setMessage('Ошибка при сохранении: ' + error.message)
      setSaving(false)
    } else {
        router.push('/feed')
    }
  }

  if (loading) return <div className="p-8 text-center font-medium" style={{ color: 'var(--text-color)' }}>Загрузка...</div>

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl p-8 md:p-10 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-color)' }}>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>Редактирование</h1>
            <p className="text-sm opacity-70 mt-1">Исправьте замечания и отправьте снова</p>
          </div>
          <Link
            href="/feed"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
          >
            Отмена
          </Link>
        </div>

        {message && (
          <div className="mb-6 p-3 text-sm rounded-lg font-medium bg-red-50 text-red-800">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
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

          {existingImages.length > 0 && (
            <div><label className="block text-sm font-medium mb-2">Текущие фото (нажмите ×, чтобы удалить)</label>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="Фото" className="h-20 w-20 object-cover rounded-lg border" style={{ borderColor: 'var(--card-border)' }} />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Добавить новые фото (макс. 3 всего)</label>
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
              disabled={saving}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {saving ? 'Сохранение...' : 'Отправить на модерацию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditEventPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-medium">Загрузка...</div>}>
      <EditEventForm />
    </Suspense>
  )
}