import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import blurSvg from '../../assets/blur.svg'
import { api } from '../../lib/api'

const ResetPasswordPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setSubmitting(true)
      await api.post(`/auth/reset-password/${token}`, { password })
      toast.success('Password reset successful')
      navigate('/auth/sign-in')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4 py-8 text-white sm:py-12'>
      <img src={blurSvg} alt='' className='pointer-events-none absolute -left-20 top-10 h-72 w-72 opacity-80' />
      <img src={blurSvg} alt='' className='pointer-events-none absolute -bottom-10 right-0 h-72 w-72 opacity-70' />

      <form onSubmit={handleSubmit} className='relative z-10 mx-auto w-full max-w-md rounded-2xl border border-primary-dull/35 bg-black/60 p-5 shadow-2xl backdrop-blur-md sm:p-6'>
        <h1 className='text-2xl font-bold'>Reset Password</h1>
        <p className='mt-1 text-sm text-gray-400'>Set a new password for your account.</p>

        <label className='mt-6 block'>
          <span className='mb-1.5 block text-sm text-gray-300'>New Password</span>
          <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
            <Lock size={16} className='text-gray-500' />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='Enter new password'
              className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
            />
            <button type='button' onClick={() => setShowPassword((prev) => !prev)} className='text-gray-400 hover:text-white'>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className='mt-4 block'>
          <span className='mb-1.5 block text-sm text-gray-300'>Confirm Password</span>
          <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
            <Lock size={16} className='text-gray-500' />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder='Confirm password'
              className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
            />
            <button type='button' onClick={() => setShowConfirmPassword((prev) => !prev)} className='text-gray-400 hover:text-white'>
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type='submit' disabled={submitting} className='mt-6 w-full rounded-xl bg-primary-dull px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>

        <p className='mt-4 text-center text-sm text-gray-400'>
          Back to <Link to='/auth/sign-in' className='text-primary-dull hover:underline'>Login</Link>
        </p>
      </form>
    </div>
  )
}

export default ResetPasswordPage
