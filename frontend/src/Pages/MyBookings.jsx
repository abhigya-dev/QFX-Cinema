import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL, api } from '../lib/api'
import dateTimeFormat from '../lib/showDate-Timefotmat'
import currencyFormat from '../lib/currencyFormat'
import toast from 'react-hot-toast'

const MyBookings = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingBookingId, setPayingBookingId] = useState(null)
  const [downloadingBookingId, setDownloadingBookingId] = useState(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const payload = await api.get('/bookings/my')
        setBookings(payload || [])
      } catch (err) {
        if (err.message.toLowerCase().includes('not authorized')) {
          navigate('/auth/sign-in')
          return
        }
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [navigate])

  if (loading) {
    return <div className='px-6 py-24 text-center'>Loading bookings...</div>
  }

  if (error) {
    return <div className='px-6 py-24 text-center text-red-400'>{error}</div>
  }

  const handlePayNow = async (bookingId) => {
    try {
      setPayingBookingId(bookingId)
      const payload = await api.post(`/payment/retry/${bookingId}`, {})
      if (payload?.url) {
        window.location.href = payload.url
        return
      }
      toast.error('Could not start payment session')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setPayingBookingId(null)
    }
  }

  const isExpiredPending = (booking) => {
    if (booking.status !== 'pending' || !booking.expiresAt) return false
    return new Date(booking.expiresAt).getTime() <= Date.now()
  }

  const handleDownloadTicket = async (bookingId) => {
    try {
      setDownloadingBookingId(bookingId)
      const response = await fetch(`${API_BASE_URL}/bookings/my/${bookingId}/ticket`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to download ticket')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ticket-${bookingId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDownloadingBookingId(null)
    }
  }

  return (
    <div className='px-6 py-24 lg:px-24'>
      <h1 className='text-2xl font-bold mb-6'>My Bookings</h1>
      {bookings.length === 0 ? (
        <p className='text-gray-400'>No bookings found.</p>
      ) : (
        <div className='flex flex-col gap-4'>
          {bookings.map((booking) => (
            <div key={booking._id} className='rounded-xl border border-primary-dull/30 bg-primary-dull/10 p-4'>
              <h2 className='font-semibold'>{booking.show?.movie?.title || 'Movie'}</h2>
              <p className='text-sm text-gray-300 mt-1'>{dateTimeFormat(booking.show?.showDateTime)}</p>
              <p className='text-sm text-gray-300 mt-1'>Seats: {(booking.bookedSeats || []).join(', ')}</p>
              <p className='text-sm text-gray-200 mt-1'>Amount: {currencyFormat(booking.amount || 0)}</p>
              <p className='text-sm mt-1'>
                Status:{' '}
                <span className={booking.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'}>
                  {booking.status}
                </span>
              </p>
              {booking.status === 'pending' && booking.expiresAt && !isExpiredPending(booking) && (
                <p className='text-xs text-gray-400 mt-1'>
                  Reserved until: {new Date(booking.expiresAt).toLocaleString()}
                </p>
              )}
              {booking.status === 'pending' && !isExpiredPending(booking) && (
                <button
                  className='mt-3 bg-primary-dull px-3 py-1.5 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed'
                  onClick={() => handlePayNow(booking._id)}
                  disabled={payingBookingId === booking._id}
                >
                  {payingBookingId === booking._id ? 'Opening payment...' : 'Pay Now'}
                </button>
              )}
              {booking.status === 'pending' && isExpiredPending(booking) && (
                <p className='text-xs text-red-300 mt-2'>Reservation expired. Please book seats again.</p>
              )}
              {booking.status === 'confirmed' && (
                <button
                  className='mt-3 bg-primary-dull px-3 py-1.5 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed'
                  onClick={() => handleDownloadTicket(booking._id)}
                  disabled={downloadingBookingId === booking._id}
                >
                  {downloadingBookingId === booking._id ? 'Downloading...' : 'Download Ticket PDF'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyBookings
