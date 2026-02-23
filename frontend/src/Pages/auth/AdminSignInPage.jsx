import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import blurSvg from '../../assets/blur.svg'
import { useAuth } from '../../context/AuthContext'
import { USE_DUMMY_DATA } from '../../lib/api'

const AdminSignInPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { adminLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/admin'
  const reason = location.state?.reason
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (values) => {
    try {
      await adminLogin(values.email, values.password)
      toast.success('Admin signed in successfully')
      navigate(from)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090B] px-4 py-8 text-white sm:py-12'>
      <img src={blurSvg} alt='' className='pointer-events-none absolute -left-20 top-10 h-72 w-72 opacity-80' />
      <img src={blurSvg} alt='' className='pointer-events-none absolute -bottom-10 right-0 h-72 w-72 opacity-70' />

      <form onSubmit={handleSubmit(onSubmit)} className='relative z-10 mx-auto w-full max-w-md rounded-2xl border border-primary-dull/35 bg-black/60 p-5 shadow-2xl backdrop-blur-md sm:p-6'>
        <h1 className='text-2xl font-bold'>Admin Sign In</h1>
        <p className='mt-1 text-sm text-gray-400'>Use an admin account to access dashboard routes.</p>
        {reason === 'admin_required' && (
          <p className='mt-2 text-xs text-red-300'>Your current account is not authorized for admin. Please sign in with an admin account.</p>
        )}
        {USE_DUMMY_DATA && (
          <p className='mt-2 text-xs text-primary-dull'>
            Dummy admin: `admin@qfx.test / admin123`
          </p>
        )}

        <div className='mt-5 space-y-4'>
          <label className='block'>
            <span className='mb-1.5 block text-sm text-gray-300'>Email</span>
            <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
              <Mail size={16} className='text-gray-500' />
              <input
                type='email'
                placeholder='Enter admin email'
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
                placeholder='Enter admin password'
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
          {isSubmitting ? 'Signing in...' : 'Admin Login'}
        </button>

        <div className='mt-4 flex items-center justify-between text-sm'>
          <Link to='/auth/sign-in' className='text-gray-400 hover:text-white'>
            User login
          </Link>
          <Link to='/auth/sign-up' className='text-primary-dull hover:underline'>
            Create account
          </Link>
        </div>
      </form>
    </div>
  )
}

export default AdminSignInPage
