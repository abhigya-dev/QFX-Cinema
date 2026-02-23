import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, DeleteIcon, Plus, Star, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Title from '../../Components/admin/Title'
import { dummyShowsData } from '../../assets/assets'
import formatNumber from '../../lib/formatNumber'
import formatShowTime from '../../lib/showTimeFormat'
import { api } from '../../lib/api'
import { normalizeMovie } from '../../lib/normalizers'
import Loader from '../../Components/Loader'

const DUMMY_MOVIES = dummyShowsData.map(normalizeMovie)
const getNowLocalInputValue = () => {
  const now = new Date()
  const tzOffset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
}
const toUtcDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const toLocalDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const getShowStartTime = (show) => {
  if (show?.startsAt) {
    const startsAt = new Date(show.startsAt)
    if (!Number.isNaN(startsAt.getTime())) return startsAt
  }

  const showDate = toUtcDateKey(show?.date)
  if (!showDate || !show?.time) return null
  const parsed = new Date(`${showDate}T${show.time}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
const isFutureShow = (show) => {
  const showDateTime = getShowStartTime(show)
  return showDateTime ? showDateTime.getTime() > Date.now() : false
}

const AddShows = () => {
  const [playingMovies, setPlayingMovies] = useState([])
  const [movieDateTime, setMovieDateTime] = useState({})
  const [selectedShow, setSelectedShow] = useState(null)
  const [showPrice, setShowPrice] = useState('')
  const [selectedDateTime, setSelectedDateTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingMovies, setLoadingMovies] = useState(true)
  const [syncingDummyMovies, setSyncingDummyMovies] = useState(false)
  const [updatingPrice, setUpdatingPrice] = useState(false)
  const [minDateTime, setMinDateTime] = useState(getNowLocalInputValue())
  const [existingShows, setExistingShows] = useState([])

  const dateTimeInputRef = useRef(null)
  const navigate = useNavigate()

  const isMongoObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ''))

  const fetchPlayingMovies = useCallback(async () => {
    try {
      const payload = await api.get('/movies')
      const normalizedMovies = (payload || []).map(normalizeMovie)

      if (normalizedMovies.length === 0) {
        setPlayingMovies(DUMMY_MOVIES)
        return
      }

      setPlayingMovies(normalizedMovies)
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        navigate('/auth/sign-in')
        return
      }

      toast.error(`${error.message}. Showing built-in movie list.`)
      setPlayingMovies(DUMMY_MOVIES)
    } finally {
      setLoadingMovies(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchPlayingMovies()
  }, [fetchPlayingMovies])

  useEffect(() => {
    const timer = setInterval(() => {
      setMinDateTime(getNowLocalInputValue())
    }, 30 * 1000)

    return () => clearInterval(timer)
  }, [])

  const openDateTimePicker = () => {
    if (!dateTimeInputRef.current) return

    if (typeof dateTimeInputRef.current.showPicker === 'function') {
      dateTimeInputRef.current.showPicker()
      return
    }

    dateTimeInputRef.current.focus()
    dateTimeInputRef.current.click()
  }

  const getMovieSource = (movieId) => (isMongoObjectId(movieId) ? 'Database' : 'Dummy')

  const normalizeTitleKey = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()

  const resolveSelectedMovieId = useCallback(async ({ allowCreate = true } = {}) => {
    let finalMovieId = selectedShow
    if (isMongoObjectId(finalMovieId)) return finalMovieId

    const selectedMovieData = playingMovies.find((movie) => movie._id === selectedShow)
    if (!selectedMovieData) {
      throw new Error('Selected movie not found')
    }

    const existingMovies = await api.get('/movies')
    const selectedTitleKey = normalizeTitleKey(selectedMovieData.title)
    const matchedMovie = (existingMovies || []).find(
      (movie) => normalizeTitleKey(movie.title) === selectedTitleKey
    )

    if (matchedMovie?._id && isMongoObjectId(matchedMovie._id)) {
      return matchedMovie._id
    }

    if (!allowCreate) {
      throw new Error('No existing movie found in database for update')
    }

    const createdMovie = await api.post('/movies', {
      title: selectedMovieData.title,
      description: selectedMovieData.overview || selectedMovieData.description || 'No description provided',
      genre: (selectedMovieData.genres || [])
        .map((genre) => (typeof genre === 'string' ? genre : genre.name))
        .filter(Boolean),
      language: (selectedMovieData.original_language || selectedMovieData.language || 'en').toUpperCase(),
      duration: Number(selectedMovieData.runtime || selectedMovieData.duration || 120),
      poster: selectedMovieData.poster_path || selectedMovieData.poster,
      backdrop:
        selectedMovieData.backdrop_path ||
        selectedMovieData.backdrop ||
        selectedMovieData.poster_path ||
        selectedMovieData.poster,
      rating: Number(selectedMovieData.vote_average || selectedMovieData.rating || 0),
      voteCount: Number(selectedMovieData.vote_count || selectedMovieData.voteCount || 0),
      releaseDate: selectedMovieData.release_date || new Date().toISOString(),
    })

    return createdMovie._id
  }, [selectedShow, playingMovies])

  const importDummyMoviesToDatabase = async () => {
    try {
      setSyncingDummyMovies(true)

      const existingMovies = await api.get('/movies')
      const existingMap = new Map(
        (existingMovies || []).map((movie) => [movie.title?.trim().toLowerCase(), movie])
      )

      let createdCount = 0
      for (const movie of DUMMY_MOVIES) {
        const normalizedTitle = movie.title?.trim().toLowerCase()
        if (!normalizedTitle || existingMap.has(normalizedTitle)) continue

        await api.post('/movies', {
          title: movie.title,
          description: movie.overview || movie.description || 'No description provided',
          genre: (movie.genres || [])
            .map((genre) => (typeof genre === 'string' ? genre : genre.name))
            .filter(Boolean),
          language: (movie.original_language || movie.language || 'en').toUpperCase(),
          duration: Number(movie.runtime || movie.duration || 120),
          poster: movie.poster_path || movie.poster,
          backdrop: movie.backdrop_path || movie.backdrop || movie.poster_path || movie.poster,
          rating: Number(movie.vote_average || movie.rating || 0),
          voteCount: Number(movie.vote_count || movie.voteCount || 0),
          releaseDate: movie.release_date || new Date().toISOString(),
        })

        createdCount += 1
      }

      await fetchPlayingMovies()

      if (createdCount === 0) {
        toast.success('Dummy movies are already in database')
      } else {
        toast.success(`${createdCount} dummy movie(s) imported to database`)
      }
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        toast.error('Admin login required')
        navigate('/auth/sign-in')
        return
      }

      toast.error(error.message)
    } finally {
      setSyncingDummyMovies(false)
    }
  }

  const handleAddTime = () => {
    if (!selectedDateTime) {
      toast.error('Please select date and time first')
      return
    }

    if (new Date(selectedDateTime).getTime() <= Date.now()) {
      toast.error('Past date/time is not allowed')
      return
    }

    const [date] = selectedDateTime.split('T')

    setMovieDateTime((prev) => {
      const existing = prev[date] || []
      if (existing.find((entry) => entry.time === selectedDateTime)) {
        toast.error('This date and time is already added')
        return prev
      }

      return {
        ...prev,
        [date]: [...existing, { time: selectedDateTime }],
      }
    })

    setSelectedDateTime('')
  }

  const handleRemoveMovieTime = (movieDate, time) => {
    setMovieDateTime((prev) => {
      const filtered = (prev[movieDate] || []).filter((entry) => entry.time !== time)
      const next = { ...prev }

      if (filtered.length > 0) {
        next[movieDate] = filtered
      } else {
        delete next[movieDate]
      }

      return next
    })
  }

  useEffect(() => {
    const fetchExistingShows = async () => {
      if (!selectedShow) {
        setExistingShows([])
        return
      }

      try {
        const movieId = isMongoObjectId(selectedShow)
          ? selectedShow
          : await resolveSelectedMovieId({ allowCreate: false })
        const payload = await api.get(`/shows/movie/${movieId}`)
        setExistingShows((payload || []).filter(isFutureShow))
      } catch {
        setExistingShows([])
      }
    }

    fetchExistingShows()
  }, [selectedShow, resolveSelectedMovieId])

  const handleUpdateExistingPrice = async () => {
    if (!selectedShow || !showPrice) {
      toast.error('Select movie and enter price first')
      return
    }

    if (!isMongoObjectId(selectedShow) || existingShows.length === 0) {
      toast.error('Select a database movie that already has shows')
      return
    }

    try {
      setUpdatingPrice(true)
      const finalMovieId = await resolveSelectedMovieId({ allowCreate: false })
      const payload = await api.put(`/shows/admin/movie/${finalMovieId}/price`, {
        price: Number(showPrice),
      })
      toast.success(payload?.message || 'Show price updated')

      const refreshed = await api.get(`/shows/movie/${finalMovieId}`)
      setExistingShows(refreshed || [])
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        toast.error('Admin login required')
        navigate('/auth/sign-in')
        return
      }
      toast.error(error.message)
    } finally {
      setUpdatingPrice(false)
    }
  }

  const handleAddShows = async () => {
    if (!selectedShow || !showPrice || Object.entries(movieDateTime).length === 0) {
      toast.error('Select movie, price and at least one date/time')
      return
    }

    try {
      setSubmitting(true)
      const finalMovieId = await resolveSelectedMovieId()

      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
      const allDateTimes = Object.values(movieDateTime).flat()
      const existingShows = (await api.get(`/shows/movie/${finalMovieId}`)).filter(isFutureShow)
      const existingShowSlots = new Set(
        (existingShows || []).map((show) => {
          const showStart = getShowStartTime(show)
          return showStart ? showStart.toISOString() : null
        }).filter(Boolean)
      )

      let createdCount = 0
      let skippedCount = 0

      for (const showDateTimeObj of allDateTimes) {
        const start = new Date(showDateTimeObj.time)
        if (Number.isNaN(start.getTime())) {
          skippedCount += 1
          continue
        }

        const startsAt = start.toISOString()
        const [date = '', timePart = ''] = String(showDateTimeObj.time).split('T')
        const hhmm = timePart.slice(0, 5)
        const time = `${hhmm}:00`
        const slotKey = startsAt

        if (existingShowSlots.has(slotKey)) {
          skippedCount += 1
          continue
        }

        const createdShow = await api.post('/shows', {
          movieId: finalMovieId,
          theatreId: 'QFX Main Hall',
          date,
          time,
          startsAt,
          totalSeats: 90,
          price: Number(showPrice),
        })

        await api.post('/seats/init', {
          showId: createdShow._id,
          rows,
          cols: 9,
        })
        existingShowSlots.add(slotKey)
        createdCount += 1
      }

      if (createdCount === 0) {
        toast('No new show created. Selected slots already exist.')
      } else if (skippedCount > 0) {
        toast.success(`${createdCount} show(s) added. ${skippedCount} duplicate slot(s) skipped.`)
      } else {
        toast.success('Show(s) added successfully')
      }
      setMovieDateTime({})
      setSelectedDateTime('')
      setSelectedShow(null)
      setShowPrice('')
      setExistingShows([])
    } catch (error) {
      if (error.message.toLowerCase().includes('not authorized')) {
        toast.error('Admin login required')
        navigate('/auth/sign-in')
        return
      }

      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedMovie = useMemo(
    () => playingMovies.find((movie) => movie._id === selectedShow),
    [playingMovies, selectedShow]
  )

  if (loadingMovies) {
    return <Loader />
  }

  if (playingMovies.length === 0) {
    return <h1>No movies available</h1>
  }

  return (
    <>
      <Title text1={'Add'} text2={'Shows'} />

      <div className='mt-8 space-y-6'>
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-700 bg-black/20 p-4'>
          <div>
            <p className='text-base font-semibold'>Movie Source Control</p>
            <p className='text-sm text-gray-400'>Import dummy movies from assets into your real database</p>
          </div>
          <button
            type='button'
            disabled={syncingDummyMovies}
            onClick={importDummyMoviesToDatabase}
            className='inline-flex items-center gap-2 rounded-md bg-primary-dull px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60'
          >
            <UploadCloud size={16} />
            {syncingDummyMovies ? 'Importing...' : 'Import Dummy Movies'}
          </button>
        </div>

        <div>
          <h2 className='mb-3 text-lg font-semibold'>Select Movie</h2>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
            {playingMovies.map((movie) => {
              const isSelected = selectedShow === movie._id
              const source = getMovieSource(movie._id)

              return (
                <button
                  key={movie._id}
                  type='button'
                  onClick={() => setSelectedShow(isSelected ? null : movie._id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-primary-dull ring-2 ring-primary-dull/60'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className='relative h-28 w-full'>
                    <img
                      src={movie.backdrop_path || movie.poster_path}
                      alt={movie.title}
                      className='h-full w-full object-cover'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent' />
                    <span
                      className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-semibold ${
                        source === 'Database' ? 'bg-emerald-500/80' : 'bg-amber-500/80'
                      }`}
                    >
                      {source}
                    </span>
                    <p className='absolute bottom-2 left-2 line-clamp-1 pr-2 text-sm font-semibold'>
                      {movie.title}
                    </p>
                  </div>
                  <div className='flex items-center justify-between bg-black/40 px-2 py-1.5 text-xs'>
                    <p className='inline-flex items-center gap-1 text-gray-300'>
                      <Star size={12} className='fill-primary-dull text-primary-dull' />
                      {(movie.vote_average || 0).toFixed(1)}
                    </p>
                    <p className='text-gray-400'>{formatNumber(movie.vote_count || 0)} votes</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className='grid gap-4 rounded-xl border border-gray-700 bg-black/20 p-4 md:grid-cols-2'>
          <div>
            <p className='mb-2 text-sm font-semibold text-gray-200'>Show Price ($)</p>
            <div className='flex w-full items-center rounded-md border border-gray-600 px-3 py-2.5'>
              <p className='text-sm text-gray-400'>$</p>
              <input
                type='number'
                min='1'
                step='1'
                value={showPrice}
                placeholder='Enter show price'
                className='no-spinner w-full bg-transparent px-2 text-sm outline-none placeholder:text-gray-500'
                onChange={(e) => setShowPrice(e.target.value)}
              />
            </div>
            <button
              type='button'
              onClick={handleUpdateExistingPrice}
              disabled={updatingPrice || !selectedShow || !showPrice}
              className='mt-3 rounded-md border border-primary-dull/60 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {updatingPrice ? 'Updating...' : 'Update Price for Existing Future Shows'}
            </button>
          </div>

          <div>
            <p className='mb-2 text-sm font-semibold text-gray-200'>Select Date and Time</p>
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <input
                  ref={dateTimeInputRef}
                  type='datetime-local'
                  value={selectedDateTime}
                  min={minDateTime}
                  className='w-full rounded-md border border-gray-600 bg-transparent px-3 py-2.5 text-sm outline-none'
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                />
                <button
                  type='button'
                  onClick={openDateTimePicker}
                  className='absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'
                >
                  <CalendarDays size={16} />
                </button>
              </div>
              <button
                type='button'
                onClick={handleAddTime}
                className='inline-flex items-center gap-1 rounded-md bg-primary-dull px-3 text-sm font-medium'
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>
        </div>

        <div className='rounded-xl border border-gray-700 bg-black/20 p-4'>
          <p className='text-sm font-semibold text-gray-200'>Existing Show Slots (Read-only)</p>
          {existingShows.length === 0 ? (
            <p className='mt-2 text-sm text-gray-400'>No existing slots for selected movie yet.</p>
          ) : (
            <div className='mt-3 flex flex-wrap gap-2'>
              {existingShows.map((show) => {
                const showStart = getShowStartTime(show)
                if (!showStart) return null
                const showDate = toLocalDateKey(showStart)
                const iso = showStart.toISOString()
                return (
                  <p key={show._id} className='rounded-md border border-gray-600 px-2 py-1 text-xs'>
                    {showDate} {formatShowTime(iso)}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        <div className='rounded-xl border border-gray-700 bg-black/20 p-4'>
          <p className='text-sm font-semibold text-gray-200'>Selected Date-Time Slots</p>
          {Object.keys(movieDateTime).length === 0 ? (
            <p className='mt-2 text-sm text-gray-400'>No slot selected yet</p>
          ) : (
            <div className='mt-3 space-y-3'>
              {Object.keys(movieDateTime).map((movieDate) => (
                <div key={movieDate}>
                  <p className='mb-2 text-sm font-semibold'>{movieDate}</p>
                  <div className='flex flex-wrap gap-2'>
                    {movieDateTime[movieDate].map((timeObj) => (
                      <p
                        key={timeObj.time}
                        className='inline-flex items-center gap-2 rounded-md border border-primary-dull/60 px-2 py-1 text-xs'
                      >
                        {formatShowTime(timeObj.time)}
                        <DeleteIcon
                          size={14}
                          color='#D63858'
                          className='cursor-pointer'
                          onClick={() => handleRemoveMovieTime(movieDate, timeObj.time)}
                        />
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='flex items-center justify-between gap-2 rounded-xl border border-gray-700 bg-black/20 p-4'>
          <p className='text-sm text-gray-300'>
            {selectedMovie ? `Selected: ${selectedMovie.title}` : 'No movie selected'}
          </p>
          <button
            type='button'
            onClick={handleAddShows}
            disabled={submitting}
            className='rounded-md bg-primary-dull px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60'
          >
            {submitting ? 'Adding shows...' : 'Add Show'}
          </button>
        </div>
      </div>
    </>
  )
}

export default AddShows
