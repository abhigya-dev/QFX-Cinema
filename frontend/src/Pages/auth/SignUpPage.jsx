import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import blurSvg from '../../assets/blur.svg'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useForm } from 'react-hook-form'
import { USE_DUMMY_DATA } from '../../lib/api'

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [otpStep, setOtpStep] = useState(false)

  const { signup, googleLogin, verifySignupOtp, resendSignupOtp } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()
  const passwordValue = watch('password')

  const onSubmit = async (values) => {
    const fullName = `${values.firstName} ${values.lastName}`.trim()

    try {
      const payload = await signup(fullName, values.email, values.password)
      setPendingEmail(values.email)
      setOtpStep(true)
      toast.success(payload?.message || 'OTP sent to your email')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const cleanOtp = otp.trim()

    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error('Enter a valid 6-digit OTP')
      return
    }

    try {
      setOtpSubmitting(true)
      await verifySignupOtp(pendingEmail, cleanOtp)
      toast.success('Account verified successfully')
      navigate('/')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setOtpSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      setResendLoading(true)
      const payload = await resendSignupOtp(pendingEmail)
      toast.success(payload?.message || 'OTP resent successfully')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const payload = await googleLogin()
      if (!payload) return
      toast.success('Signed up with Google')
      navigate(payload?.isAdmin ? '/admin' : '/')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-[#09090B] px-4 py-8 text-white sm:py-12'>
      <img src={blurSvg} alt='' className='pointer-events-none absolute -left-20 top-8 h-80 w-80 opacity-80' />
      <img src={blurSvg} alt='' className='pointer-events-none absolute -bottom-14 right-0 h-80 w-80 opacity-70' />

      {!otpStep ? (
        <form onSubmit={handleSubmit(onSubmit)} className='relative mx-auto w-full max-w-3xl rounded-2xl border border-primary-dull/35 bg-black/55 p-5 backdrop-blur-md sm:p-6'>
          <h1 className='text-2xl font-bold'>Create Account</h1>
          <p className='mt-1 text-sm text-gray-400'>Join QFX Cinemas to manage bookings and favorites.</p>
          {USE_DUMMY_DATA && (
            <p className='mt-2 text-xs text-primary-dull'>
              Dummy users: `user@qfx.test / user123` and `admin@qfx.test / admin123`
            </p>
          )}

          <button
            type='button'
            onClick={handleGoogleSignup}
            className='mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-dull/30 bg-primary-dull/10 px-4 py-2.5 text-sm font-medium hover:bg-primary-dull/20'
          >
            <span className='text-base font-semibold'>G</span>
            Sign up with Google
          </button>

          <div className='my-5 flex items-center gap-3'>
            <span className='h-px flex-1 bg-gray-800' />
            <span className='text-xs text-gray-500'>OR</span>
            <span className='h-px flex-1 bg-gray-800' />
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <label className='block'>
              <span className='mb-1.5 block text-sm text-gray-300'>First Name *</span>
              <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
                <User size={16} className='text-gray-500' />
                <input
                  type='text'
                  placeholder='First name'
                  className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
                  {...register('firstName', { required: 'First name is required' })}
                />
              </div>
              {errors.firstName && <p className='mt-1 text-xs text-red-300'>{errors.firstName.message}</p>}
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-sm text-gray-300'>Last Name *</span>
              <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
                <User size={16} className='text-gray-500' />
                <input
                  type='text'
                  placeholder='Last name'
                  className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
                  {...register('lastName', { required: 'Last name is required' })}
                />
              </div>
              {errors.lastName && <p className='mt-1 text-xs text-red-300'>{errors.lastName.message}</p>}
            </label>

            <label className='block md:col-span-2'>
              <span className='mb-1.5 block text-sm text-gray-300'>Email *</span>
              <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
                <Mail size={16} className='text-gray-500' />
                <input
                  type='email'
                  placeholder='Email address'
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
              <span className='mb-1.5 block text-sm text-gray-300'>Password *</span>
              <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
                <Lock size={16} className='text-gray-500' />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Create password'
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

            <label className='block'>
              <span className='mb-1.5 block text-sm text-gray-300'>Confirm Password *</span>
              <div className='flex items-center gap-2 rounded-xl border border-gray-700 px-3 py-2'>
                <Lock size={16} className='text-gray-500' />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder='Confirm password'
                  className='w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === passwordValue || 'Passwords do not match',
                  })}
                />
                <button type='button' onClick={() => setShowConfirmPassword((prev) => !prev)} className='text-gray-400 hover:text-white'>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className='mt-1 text-xs text-red-300'>{errors.confirmPassword.message}</p>}
            </label>

            <label className='md:col-span-2 flex items-start gap-2 text-sm text-gray-300'>
              <input
                type='checkbox'
                className='mt-0.5 h-4 w-4 accent-primary-dull'
                {...register('terms', { required: 'You must accept terms and conditions' })}
              />
              <span>I agree to the Terms & Conditions</span>
            </label>
            {errors.terms && <p className='md:col-span-2 text-xs text-red-300'>{errors.terms.message}</p>}
          </div>

          <button type='submit' disabled={isSubmitting} className='mt-6 w-full rounded-xl bg-primary-dull px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'>
            {isSubmitting ? 'Sending OTP...' : 'Continue'}
          </button>

          <p className='mt-4 text-center text-sm text-gray-400'>
            Already have an account? <Link to='/auth/sign-in' className='text-primary-dull hover:underline'>Login</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className='relative mx-auto w-full max-w-md rounded-2xl border border-primary-dull/35 bg-black/55 p-5 backdrop-blur-md sm:p-6'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-dull/20 text-primary-dull'>
            <ShieldCheck size={22} />
          </div>
          <h1 className='text-center text-2xl font-bold'>Verify Your Email</h1>
          <p className='mt-2 text-center text-sm text-gray-400'>
            Enter the 6-digit OTP sent to
          </p>
          <p className='text-center text-sm font-semibold text-white'>{pendingEmail}</p>

          <label className='mt-6 block'>
            <span className='mb-1.5 block text-sm text-gray-300'>OTP Code</span>
            <input
              type='text'
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder='Enter 6-digit OTP'
              className='w-full rounded-xl border border-gray-700 bg-transparent px-4 py-3 text-center text-xl tracking-[0.5em] outline-none placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-500'
            />
          </label>

          <button type='submit' disabled={otpSubmitting} className='mt-6 w-full rounded-xl bg-primary-dull px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60'>
            {otpSubmitting ? 'Verifying...' : 'Verify & Create Account'}
          </button>

          <button
            type='button'
            onClick={handleResendOtp}
            disabled={resendLoading}
            className='mt-3 w-full rounded-xl border border-primary-dull/40 px-4 py-2.5 text-sm font-medium text-primary-dull disabled:cursor-not-allowed disabled:opacity-60'
          >
            {resendLoading ? 'Resending OTP...' : 'Resend OTP'}
          </button>

          <button
            type='button'
            onClick={() => {
              setOtpStep(false)
              setOtp('')
              setPendingEmail('')
            }}
            className='mt-3 w-full text-sm text-gray-400 underline-offset-4 hover:underline'
          >
            Change email
          </button>
        </form>
      )}
    </div>
  )
}

export default SignUpPage
