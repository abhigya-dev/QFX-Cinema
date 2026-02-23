import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { assets } from '../assets/assets'

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read selected image'))
    reader.readAsDataURL(file)
  })

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not process selected image'))
    image.src = src
  })

const optimizeImageDataUrl = async (file) => {
  const originalDataUrl = await fileToDataUrl(file)
  const image = await loadImage(originalDataUrl)

  const maxDimension = 900
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return originalDataUrl

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

const dataUrlByteSize = (dataUrl) => {
  const base64 = String(dataUrl || '').split(',')[1] || ''
  return Math.floor((base64.length * 3) / 4)
}

const Settings = () => {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [preview, setPreview] = useState(user?.imageUrl || '')
  const [fileDataUrl, setFileDataUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const avatar = useMemo(() => preview || user?.imageUrl || assets.profile, [preview, user?.imageUrl])

  const handleSelectImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image must be smaller than 12MB')
      return
    }

    try {
      const dataUrl = await optimizeImageDataUrl(file)
      if (dataUrlByteSize(dataUrl) > 2 * 1024 * 1024) {
        toast.error('Please choose a smaller image')
        return
      }
      setPreview(dataUrl)
      setFileDataUrl(dataUrl)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      toast.error('Username is required')
      return
    }

    try {
      setSaving(true)
      const payload = await updateProfile({
        name: trimmedName,
        profileImage: fileDataUrl || undefined,
      })
      setName(payload?.name || trimmedName)
      setPreview(payload?.imageUrl || '')
      setFileDataUrl('')
      toast.success(payload?.message || 'Profile updated')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='min-h-screen px-5 py-28 lg:px-28'>
      <div className='mx-auto max-w-2xl rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md'>
        <h1 className='text-2xl font-bold'>Settings</h1>
        <p className='mt-1 text-sm text-gray-400'>Update your username and profile photo.</p>

        <form className='mt-6 space-y-5' onSubmit={handleSubmit}>
          <div className='flex items-center gap-4'>
            <img src={avatar} alt='profile' className='h-18 w-18 rounded-full object-cover border border-white/20' />
            <label className='cursor-pointer rounded-lg border border-primary-dull/60 px-4 py-2 text-sm hover:bg-primary-dull/10'>
              Change Photo
              <input type='file' accept='image/*' className='hidden' onChange={handleSelectImage} />
            </label>
          </div>

          <div>
            <label className='mb-1 block text-sm text-gray-300'>Username</label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full rounded-lg border border-white/20 bg-black/20 px-3 py-2 outline-none'
              placeholder='Enter your username'
            />
          </div>

          <button
            type='submit'
            disabled={saving}
            className='rounded-lg bg-primary-dull px-5 py-2 text-sm font-semibold disabled:opacity-60'
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Settings
