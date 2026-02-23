import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'

const BookingSuccess = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('Verifying payment...')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const verify = async () => {
      if (!sessionId) {
        setStatus('Missing payment session id.')
        return
      }

      try {
        const result = await api.get(`/payment/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        if (result?.status === 'confirmed' || result?.paymentStatus === 'paid') {
          setStatus('Payment successful. Booking confirmed.')
          return
        }
        setStatus('Payment received, but booking is still processing.')
      } catch (error) {
        setStatus(error.message || 'Could not verify payment session.')
      }
    }

    verify()
  }, [sessionId])

  return (
    <div className='min-h-screen flex items-center justify-center px-6'>
      <div className='max-w-md text-center rounded-xl border border-primary-dull/30 bg-primary-dull/10 p-6'>
        <h1 className='text-2xl font-bold'>Booking Status</h1>
        <p className='mt-3 text-gray-300'>{status}</p>
        <div className='mt-5 flex justify-center gap-3'>
          <Link to='/mybookings' className='bg-primary-dull px-4 py-2 rounded-md'>My Bookings</Link>
          <Link to='/movies' className='border border-primary-dull px-4 py-2 rounded-md'>Browse Movies</Link>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccess
