import React, { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import blurSvg from '../../assets/blur.svg'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { CUSTOMER_TOKEN_KEY, USE_DUMMY_DATA } from '../../lib/api'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, googleLogin, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.redirectTo
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const processedGoogleTokenRef = useRef(null)

  useEffect(() => {
    const hash = window.location.hash || ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const googleToken = params.get('google_token')
    if (!googleToken) return
    if (processedGoogleTokenRef.current === googleToken) return
    processedGoogleTokenRef.current = googleToken

    const completeGoogleLogin = async () => {
      try {
        window.localStorage.setItem(CUSTOMER_TOKEN_KEY, googleToken)
        const me = await refreshUser()
        if (!me) {
          throw new Error('Google login session could not be restored')
        }
        toast.success('Signed in with Google')
        navigate(redirectTo || '/')
      } catch (error) {
        window.localStorage.removeItem(CUSTOMER_TOKEN_KEY)
        toast.error(error.message)
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    completeGoogleLogin()
  }, [navigate, refreshUser, redirectTo])

  const onSubmit = async (values) => {
    try {
      const payload = await login(values.email, values.password)
      toast.success('Signed in successfully')
      if (payload?.isAdmin) {
        navigate('/admin')
        return
      }
      navigate(redirectTo || '/')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const payload = await googleLogin()
      if (!payload) return
      toast.success('Signed in with Google')
      if (payload?.isAdmin) {
        navigate('/admin')
        return
      }
      navigate(redirectTo || '/')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4 py-8 text-white sm:py-12'>
      <img src={blurSvg} alt='' className='pointer-events-none absolute -left-20 top-10 h-72 w-72 opacity-80' />
      <img src={blurSvg} alt='' className='pointer-events-none absolute -bottom-10 right-0 h-72 w-72 opacity-70' />

      <form onSubmit={handleSubmit(onSubmit)} className='relative z-10 mx-auto w-full max-w-md rounded-2xl border border-primary-dull/35 bg-black/60 p-5 shadow-2xl backdrop-blur-md sm:p-6'>
        <h1 className='text-2xl font-bold'>Sign In</h1>
        <p className='mt-1 text-sm text-gray-400'>Welcome back to QFX Cinemas.</p>
        {location.state?.reason === 'admin_session' && (
          <p className='mt-2 text-xs text-amber-300'>
            Admin login is separate. Sign in with a customer account to continue booking.
          </p>
        )}
        {USE_DUMMY_DATA && (
          <p className='mt-2 text-xs text-primary-dull'>
            Dummy login: `admin@qfx.test / admin123` or `user@qfx.test / user123`
          </p>
        )}

        <button
          type='button'
          onClick={handleGoogleLogin}
          className='mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-dull/30 bg-primary-dull/10 px-4 py-2.5 text-sm font-medium hover:bg-primary-dull/20'
        >
          <span className='text-base font-semibold'>G</span>
          Login with Google
        </button>

        <div className='my-5 flex items-center gap-3'>
          <span className='h-px flex-1 bg-gray-800' />
          <span className='text-xs text-gray-500'>OR</span>
          <span className='h-px flex-1 bg-gray-800' />
        </div>

        <div className='space-y-4'>
          <label className='block'>
            <span className='mb-1.5 block text-sm text-gray-300'>Email</span>
            <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
              <Mail size={16} className='text-gray-500' />
              <input
                type='email'
                placeholder='Enter email'
                className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
            </div>
            {errors.email && <p className='mt-1 text-xs text-red-300'>{errors.email.message}</p>}
          </label>

          <label className='block'>
            <span className='mb-1.5 block text-sm text-gray-300'>Password</span>
            <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
              <Lock size={16} className='text-gray-500' />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder='Enter password'
                className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button type='button' onClick={() => setShowPassword((prev) => !prev)} className='text-gray-400 hover:text-white'>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className='mt-1 text-xs text-red-300'>{errors.password.message}</p>}
          </label>
        </div>

        <button type='submit' disabled={isSubmitting} className='mt-6 w-full rounded-xl bg-primary-dull px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>

        <div className='mt-4 flex items-center justify-between text-sm'>
          <Link to='/auth/forgot-password' className='text-gray-400 hover:text-white'>
            Forgot password?
          </Link>
          <Link to='/auth/sign-up' className='text-primary-dull hover:underline'>
            Create account
          </Link>
        </div>
      </form>
    </div>
  )
}

export default SignInPage
