import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import formatShowTime from '../lib/showTimeFormat'
import { ArrowRight, Clock } from 'lucide-react'
import blurSvg from '../assets/blur.svg'
import { assets } from '../assets/assets.js'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Loader from '../Components/Loader'
import { getSocket } from '../lib/socketClient'

const SeatLayout = () => {
  const { id: movieId, date } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [showTimes, setShowTimes] = useState([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [selectedTime, setSelectedTime] = useState(null)
  const [selectedShowId, setSelectedShowId] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeat, setSelectedSeat] = useState([])
  const [processingSeatIds, setProcessingSeatIds] = useState([])
  const [checkingOut, setCheckingOut] = useState(false)
  const [reservationEndsAt, setReservationEndsAt] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const groupRows = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H'], ['I', 'J']]
  const redirectPath = `/movies/${movieId}/${date}`

  const toLocalDateKey = (value) => {
    const dt = new Date(value)
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const toUtcDateKey = (value) => {
    const dt = new Date(value)
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const getShowStartTime = (show) => {
    if (show?.startsAt) {
      const startsAt = new Date(show.startsAt)
      if (!Number.isNaN(startsAt.getTime())) return startsAt
    }

    const showDate = toUtcDateKey(show?.date)
    if (!showDate || !show?.time) return null
    const parsedDateTime = new Date(`${showDate}T${show.time}`)
    return Number.isNaN(parsedDateTime.getTime()) ? null : parsedDateTime
  }

  const selectedShowIdRef = useRef(null)
  selectedShowIdRef.current = selectedShowId

  const applySeatUpdates = (currentSeats, updates) => {
    if (!updates?.length) return currentSeats
    const updatesMap = new Map(updates.map((seat) => [String(seat._id), seat]))
    return currentSeats.map((seat) => {
      const patch = updatesMap.get(String(seat._id))
      return patch
        ? {
            ...seat,
            status: patch.status,
            reservedBy: patch.reservedBy,
            reservedUntil: patch.reservedUntil,
          }
        : seat
    })
  }

  const syncMyReservationFromSeats = useCallback((seatList) => {
    if (!user?._id) {
      setReservationEndsAt(null)
      return
    }

    const myReserved = (seatList || []).filter(
      (seat) =>
        seat.status === 'reserved' &&
        seat.reservedBy &&
        String(seat.reservedBy) === String(user._id) &&
        seat.reservedUntil
    )

    setSelectedSeat(myReserved.map((seat) => String(seat._id)))

    const latest = myReserved
      .map((seat) => new Date(seat.reservedUntil).getTime())
      .sort((a, b) => b - a)[0]

    if (latest && latest > Date.now()) {
      setReservationEndsAt(new Date(latest))
    } else {
      setReservationEndsAt(null)
    }
  }, [user?._id])

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const shows = await api.get(`/shows/movie/${movieId}`)
        const now = Date.now()
        const filteredShows = (shows || [])
          .map((show) => {
            const parsedDateTime = getShowStartTime(show)
            if (!parsedDateTime) return null
            return {
              showId: show._id,
              time: parsedDateTime.toISOString(),
              localDateKey: toLocalDateKey(parsedDateTime),
            }
          })
          .filter(Boolean)
          .filter((show) => show.localDateKey === date)
          .filter((show) => new Date(show.time).getTime() >= now)
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

        setShowTimes(filteredShows)
        if (filteredShows.length > 0) {
          setSelectedTime(filteredShows[0].time)
          setSelectedShowId(filteredShows[0].showId)
        }
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoadingShows(false)
      }
    }

    fetchShows()
  }, [movieId, date])

  useEffect(() => {
    if (!selectedShowId) return

    const fetchSeats = async () => {
      try {
        setLoadingSeats(true)
        const payload = await api.get(`/seats/show/${selectedShowId}`)
        const allSeats = payload || []
        setSeats(allSeats)
        syncMyReservationFromSeats(allSeats)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoadingSeats(false)
      }
    }

    fetchSeats()
  }, [selectedShowId, user?._id, syncMyReservationFromSeats])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleSeatStatusUpdated = (payload) => {
      if (!payload?.showId || String(payload.showId) !== String(selectedShowIdRef.current)) return
      setSeats((prevSeats) => {
        const nextSeats = applySeatUpdates(prevSeats, payload.seats || [])
        syncMyReservationFromSeats(nextSeats)
        return nextSeats
      })
    }
    const handleShowDeleted = (payload) => {
      if (!payload?.showId || String(payload.showId) !== String(selectedShowIdRef.current)) return
      toast.error('This show is no longer available')
      navigate(`/movies/${movieId}`)
    }

    socket.on('seatStatusUpdated', handleSeatStatusUpdated)
    socket.on('showDeleted', handleShowDeleted)

    return () => {
      socket.off('seatStatusUpdated', handleSeatStatusUpdated)
      socket.off('showDeleted', handleShowDeleted)
    }
  }, [user?._id, syncMyReservationFromSeats, navigate, movieId])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !selectedShowId) return

    socket.emit('joinShow', selectedShowId)

    return () => {
      socket.emit('leaveShow', selectedShowId)
    }
  }, [selectedShowId])

  useEffect(() => {
    if (!reservationEndsAt) {
      setSecondsLeft(0)
      return
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(reservationEndsAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
      if (diff === 0) {
        setReservationEndsAt(null)
        setSelectedSeat([])
        toast.error('Booking session expired. Seats were released.')
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [reservationEndsAt])

  const seatsByRow = useMemo(() => {
    const grouped = {}
    seats.forEach((seat) => {
      if (!grouped[seat.row]) grouped[seat.row] = []
      grouped[seat.row].push(seat)
    })

    Object.keys(grouped).forEach((row) => {
      grouped[row].sort((a, b) => {
        const aNum = Number(a.seatNumber.replace(/[A-Za-z]/g, ''))
        const bNum = Number(b.seatNumber.replace(/[A-Za-z]/g, ''))
        return aNum - bNum
      })
    })

    return grouped
  }, [seats])

  const holdSeat = async (seat) => {
    if (!selectedShowId) return
    if (selectedSeat.length >= 5) {
      toast.error('You can select only 5 seats at a time')
      return
    }

    try {
      setProcessingSeatIds((prev) => [...prev, seat._id])
      const response = await api.post('/seats/reserve', { showId: selectedShowId, seatIds: [seat._id] })
      if (response?.reservedUntil) {
        setReservationEndsAt(new Date(response.reservedUntil))
      }
      setSelectedSeat((prev) => (prev.includes(seat._id) ? prev : [...prev, seat._id]))
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        toast.error('Please login first')
        navigate('/auth/sign-in', { state: { redirectTo: redirectPath } })
        return
      }
      toast.error(error.message)
    } finally {
      setProcessingSeatIds((prev) => prev.filter((id) => id !== seat._id))
    }
  }

  const releaseSeat = async (seat) => {
    if (!selectedShowId) return

    try {
      setProcessingSeatIds((prev) => [...prev, seat._id])
      await api.post('/seats/release', { showId: selectedShowId, seatIds: [seat._id] })
      setSelectedSeat((prev) => prev.filter((id) => id !== seat._id))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setProcessingSeatIds((prev) => prev.filter((id) => id !== seat._id))
    }
  }

  const handleSeatClick = async (seat) => {
    if (!selectedTime) {
      toast.error('Please select time first')
      return
    }

    const isProcessing = processingSeatIds.includes(seat._id)
    if (isProcessing) return

    const isOwnedReserved =
      seat.status === 'reserved' && seat.reservedBy && String(seat.reservedBy) === String(user?._id)
    const isSelected = selectedSeat.includes(seat._id)

    if (isSelected || isOwnedReserved) {
      await releaseSeat(seat)
      return
    }

    if (seat.status !== 'available') {
      return
    }

    await holdSeat(seat)
  }

  const handleSelectTime = (show) => {
    setSelectedTime(show.time)
    setSelectedShowId(show.showId)
    setSelectedSeat([])
    setReservationEndsAt(null)
  }

  const createRow = (row) => {
    const rowSeats = seatsByRow[row] || []

    return (
      <div className='grid min-w-[360px] grid-cols-9 gap-2.5'>
        {rowSeats.map((seat) => {
          const isSelected = selectedSeat.includes(seat._id)
          const isOwnedReserved =
            seat.status === 'reserved' && seat.reservedBy && String(seat.reservedBy) === String(user?._id)
          const isBlocked = seat.status === 'booked' || (seat.status === 'reserved' && !isOwnedReserved && !isSelected)
          const isProcessing = processingSeatIds.includes(seat._id)

          return (
            <button
              key={seat._id}
              className={`${isSelected || isOwnedReserved ? 'bg-primary-dull' : 'bg-primary-dull/15'}
                aspect-square
                w-full
                text-[10px]
                sm:text-xs
                rounded-sm
                border border-primary-dull/30
                text-white
                ${isBlocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                ${isProcessing ? 'opacity-60' : ''}
                ${!isSelected && !isBlocked && !isOwnedReserved ? 'hover:bg-primary-dull/30' : ''}
                transition
              `}
              onClick={() => handleSeatClick(seat)}
              disabled={isBlocked || isProcessing || checkingOut}
            >
              {seat.seatNumber}
            </button>
          )
        })}
      </div>
    )
  }

  const handleCheckout = async () => {
    if (!selectedShowId || selectedSeat.length === 0) {
      toast.error('Please select show time and seats')
      return
    }

    try {
      setCheckingOut(true)
      const session = await api.post('/payment/create-checkout-session', {
        showId: selectedShowId,
        seatIds: selectedSeat,
      })
      if (session?.url) {
        window.location.href = session.url
        return
      }
      toast.success('Seats reserved')
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        toast.error('Please login first')
        navigate('/auth/sign-in', { state: { redirectTo: redirectPath } })
        return
      }
      toast.error(error.message)
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <>
      {(loadingShows || loadingSeats) && <Loader />}
      <div key={date} className='relative mt-16 flex flex-col overflow-x-hidden px-3 py-6 pb-20 sm:px-6 lg:flex-row lg:px-10 lg:py-10'>
        {secondsLeft > 0 && (
          <div className='fixed right-3 top-[72px] z-50 rounded-md border border-white/20 bg-primary-dull px-3 py-1.5 text-white shadow-lg lg:hidden'>
            <p className='text-xs font-semibold'>
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </p>
          </div>
        )}

        <img
          src={blurSvg}
          alt=''
          className='absolute lg:-top-20 -top-20 w-45 h-60 right-0 lg:left-30 lg:w-70 lg:h-80 object-cover  overflow-hidden'
        />

        <div className='z-30 w-full lg:w-auto'>
          <div className='mb-6 rounded-lg border border-primary-dull/40 bg-primary-dull/20 py-3 sm:mb-8 sm:py-4 lg:sticky lg:top-10 lg:mb-15 lg:w-50 lg:py-10'>
            {secondsLeft > 0 && (
              <div className='mx-4 mb-4 hidden rounded-md border border-white/20 bg-primary-dull px-3 py-2 text-white lg:block'>
                <p className='text-xs font-semibold'>
                  Booking session ends in {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
                </p>
              </div>
            )}
            <p className='px-4 text-sm font-bold sm:px-6 sm:text-base'>Available Timings</p>

            <div className='mt-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:mt-0 lg:flex-col lg:items-start lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0'>
              {showTimes.map((show) => (
                <button
                  key={show.showId}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs transition cursor-pointer sm:px-4 sm:text-sm lg:w-full lg:rounded-r-md lg:rounded-l-none lg:px-7
                    ${selectedShowId !== show.showId ? 'hover:bg-primary-dull/15' : ''}
                    ${selectedShowId === show.showId ? 'bg-primary-dull' : ''}
                  `}
                  onClick={() => handleSelectTime(show)}
                >
                  <Clock size={16} />
                  {formatShowTime(show.time)}
                </button>
              ))}
              {!loadingShows && showTimes.length === 0 && <p className='px-3 text-sm text-gray-300 lg:px-6'>No shows for selected date.</p>}
            </div>
          </div>
        </div>

        <div className='flex w-full flex-col gap-8 lg:gap-10'>
          <div className='flex flex-col items-center gap-2 px-2 sm:px-5'>
            <h1 className='mb-3 text-center text-xl font-bold sm:mb-4 sm:text-2xl'>Select your seat</h1>

            <img
              src={assets.screenImage}
              alt='screen'
              className='w-full max-w-md sm:max-w-lg md:max-w-xl'
            />

            <p className='text-xs text-gray-300'>SCREEN SIDE</p>
          </div>

          <div className='mt-6 flex justify-center overflow-x-auto px-1 sm:mt-12 lg:mt-20'>
            <div className='grid w-full min-w-[360px] max-w-104 grid-cols-1 gap-4'>
              {groupRows[0].map((row) => (
                <div key={row}>
                  {createRow(row)}
                </div>
              ))}
            </div>
          </div>

          <div className='w-full overflow-x-auto'>
            <div className='mx-auto grid min-w-[760px] max-w-4xl grid-cols-2 gap-11 px-1 sm:px-0'>
              {groupRows.slice(1).map((rows, index) => (
                <div key={index} className='flex flex-col gap-3'>
                  {rows.map((row) => (
                    <div key={row}>
                      {createRow(row)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className='mt-3 flex w-full items-center justify-center gap-3 self-center sm:mt-5'>
            <button
              className='flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-primary-dull px-4 py-2 text-sm font-semibold sm:w-auto sm:max-w-none sm:gap-3 sm:px-5 disabled:cursor-not-allowed disabled:opacity-60'
              onClick={handleCheckout}
              disabled={checkingOut || selectedSeat.length === 0}
            >
              {checkingOut ? 'Processing...' : 'Proceed to Checkout'} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SeatLayout
