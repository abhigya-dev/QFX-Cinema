import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import blurSvg from '../../assets/blur.svg'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      await api.post('/auth/forgot-password', { email })
      toast.success('Reset link sent to your email')
      setEmail('')
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
        <h1 className='text-2xl font-bold'>Forgot Password</h1>
        <p className='mt-1 text-sm text-gray-400'>Enter your email to receive reset instructions.</p>

        <label className='mt-6 block'>
          <span className='mb-1.5 block text-sm text-gray-300'>Email</span>
          <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
            <Mail size={16} className='text-gray-500' />
            <input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='Enter your email'
              className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
              required
            />
          </div>
        </label>

        <button type='submit' disabled={submitting} className='mt-6 w-full rounded-xl bg-primary-dull px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className='mt-4 text-center text-sm text-gray-400'>
          Back to <Link to='/auth/sign-in' className='text-primary-dull hover:underline'>Login</Link>
        </p>
      </form>
    </div>
  )
}

export default ForgotPasswordPage
