import { dummyBookingData, dummyDashboardData, dummyDateTimeData, dummyShowsData } from '../assets/assets'

const USERS_KEY = 'qfx_mock_users'
const SESSION_KEY = 'qfx_mock_session'
const SHOWS_KEY = 'qfx_mock_shows'
const SEATS_KEY = 'qfx_mock_seats'
const BOOKINGS_KEY = 'qfx_mock_bookings'

const read = (key, fallback) => {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const seedUsers = () => {
  const users = read(USERS_KEY, null)
  if (users) return users
  const initialUsers = [
    {
      _id: 'mock-admin-1',
      name: 'Admin User',
      email: 'admin@qfx.test',
      password: 'admin123',
      isAdmin: true,
      isVerified: true,
    },
    {
      _id: 'mock-user-1',
      name: 'Test User',
      email: 'user@qfx.test',
      password: 'user123',
      isAdmin: false,
      isVerified: true,
    },
  ]
  write(USERS_KEY, initialUsers)
  return initialUsers
}

const seedShows = () => {
  const shows = read(SHOWS_KEY, null)
  if (shows) return shows

  const initialShows = []
  dummyShowsData.forEach((movie) => {
    Object.entries(dummyDateTimeData).forEach(([date, values]) => {
      values.forEach((value, index) => {
        const showDate = new Date(value.time)
        initialShows.push({
          _id: `${movie._id}-show-${date}-${index}`,
          movieId: movie._id,
          theatreId: 'QFX Main Hall',
          date,
          time: `${String(showDate.getUTCHours()).padStart(2, '0')}:${String(showDate.getUTCMinutes()).padStart(2, '0')}:00`,
          totalSeats: 90,
          bookedSeats: 0,
          price: 12,
        })
      })
    })
  })

  write(SHOWS_KEY, initialShows)
  return initialShows
}

const seedBookings = () => {
  const bookings = read(BOOKINGS_KEY, null)
  if (bookings) return bookings
  const initial = dummyBookingData.map((item, index) => ({
    _id: item._id || `dummy-booking-${index}`,
    userId: item.user?._id || 'mock-user-1',
    showId: item.show?._id || `dummy-show-${index}`,
    movieId: item.show?.movie?._id || dummyShowsData[0]._id,
    seatIds: (item.bookedSeats || []).map((seat) => ({ _id: `seat-${seat}`, seatNumber: seat })),
    totalAmount: item.amount || 50,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  }))
  write(BOOKINGS_KEY, initial)
  return initial
}

const ensureSeatMap = () => {
  const seatsMap = read(SEATS_KEY, {})
  write(SEATS_KEY, seatsMap)
  return seatsMap
}

const generateSeatsForShow = (showId) => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const seats = []
  rows.forEach((row) => {
    for (let col = 1; col <= 9; col += 1) {
      seats.push({
        _id: `${showId}-${row}${col}`,
        showId,
        seatNumber: `${row}${col}`,
        row,
        type: row === 'A' ? 'premium' : 'normal',
        status: 'available',
      })
    }
  })
  return seats
}

const withSessionUser = () => {
  const session = read(SESSION_KEY, null)
  if (!session) throw new Error('Not authorized, no token')
  const users = seedUsers()
  const user = users.find((item) => item._id === session.userId)
  if (!user) throw new Error('Not authorized, user not found')
  return user
}

const asPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isVerified: Boolean(user.isVerified),
  isAdmin: Boolean(user.isAdmin),
  imageUrl: user.imageUrl || '',
})

const getMovieById = (movieId) => dummyShowsData.find((movie) => movie._id === movieId)

const showDateTimeIso = (show) => new Date(`${show.date}T${show.time}`).toISOString()

export const handleMockRequest = (path, method, body) => {
  seedUsers()
  seedShows()
  seedBookings()
  ensureSeatMap()

  if (path === '/auth/signup' && method === 'POST') {
    const users = seedUsers()
    const exists = users.find((user) => user.email.toLowerCase() === String(body.email || '').toLowerCase())
    if (exists) throw new Error('User already exists')

    const newUser = {
      _id: `mock-user-${Date.now()}`,
      name: body.name,
      email: body.email,
      password: body.password,
      isAdmin: false,
      isVerified: true,
    }
    users.push(newUser)
    write(USERS_KEY, users)
    write(SESSION_KEY, { userId: newUser._id })
    return asPublicUser(newUser)
  }

  if (path === '/auth/signin' && method === 'POST') {
    const users = seedUsers()
    const user = users.find((item) => item.email.toLowerCase() === String(body.email || '').toLowerCase())
    if (!user || user.password !== body.password) {
      throw new Error('Invalid email or password')
    }
    write(SESSION_KEY, { userId: user._id })
    return asPublicUser(user)
  }

  if (path === '/auth/google' && method === 'POST') {
    const users = seedUsers()
    const user = users.find((item) => !item.isAdmin) || users[0]
    write(SESSION_KEY, { userId: user._id })
    return asPublicUser(user)
  }

  if (path === '/auth/me' && method === 'GET') {
    return asPublicUser(withSessionUser())
  }

  if (path === '/auth/logout' && method === 'POST') {
    localStorage.removeItem(SESSION_KEY)
    return { message: 'Logged out successfully' }
  }

  if (path === '/auth/me' && method === 'PUT') {
    const users = seedUsers()
    const session = read(SESSION_KEY, null)
    const user = users.find((item) => item._id === session?.userId)
    if (!user) throw new Error('Not authorized, user not found')
    if (typeof body.name === 'string' && body.name.trim()) {
      user.name = body.name.trim()
    }
    if (typeof body.profileImage === 'string' && body.profileImage.trim()) {
      user.imageUrl = body.profileImage
    }
    write(USERS_KEY, users)
    return { ...asPublicUser(user), message: 'Profile updated successfully' }
  }

  if (path === '/auth/forgot-password' && method === 'POST') {
    return { message: 'Password reset link sent to email' }
  }

  if (path.startsWith('/auth/reset-password/') && method === 'POST') {
    return { message: 'Password reset successful. You can now login.' }
  }

  if (path === '/movies' && method === 'GET') {
    return dummyShowsData
  }

  if (path.startsWith('/movies/') && method === 'GET') {
    const movieId = path.split('/')[2]
    const movie = getMovieById(movieId)
    if (!movie) throw new Error('Movie not found')
    return movie
  }

  if (path.startsWith('/shows/movie/') && method === 'GET') {
    const movieId = path.split('/')[3]
    return seedShows().filter((show) => show.movieId === movieId)
  }

  if (path === '/shows' && method === 'POST') {
    const user = withSessionUser()
    if (!user.isAdmin) throw new Error('Not authorized as an admin')
    const shows = seedShows()
    const created = {
      _id: `mock-show-${Date.now()}`,
      movieId: body.movieId,
      theatreId: body.theatreId,
      date: body.date,
      time: body.time,
      totalSeats: body.totalSeats,
      bookedSeats: 0,
      price: body.price,
    }
    shows.push(created)
    write(SHOWS_KEY, shows)
    return created
  }

  if (path === '/shows/admin/dashboard' && method === 'GET') {
    const user = withSessionUser()
    if (!user.isAdmin) throw new Error('Not authorized as an admin')
    const bookings = seedBookings().filter((booking) => booking.status === 'confirmed')
    const users = seedUsers()
    const shows = seedShows()
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
    return {
      totalBookings: bookings.length || dummyDashboardData.totalBookings,
      totalRevenue: totalRevenue || dummyDashboardData.totalRevenue,
      totalUser: users.length || dummyDashboardData.totalUser,
      activeShows: shows.length,
    }
  }

  if (path === '/shows/admin/list' && method === 'GET') {
    const user = withSessionUser()
    if (!user.isAdmin) throw new Error('Not authorized as an admin')
    const shows = seedShows()
    const bookings = seedBookings()
    return shows.map((show) => {
      const showBookings = bookings.filter((booking) => booking.showId === show._id && booking.status === 'confirmed')
      const totalRevenue = showBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)
      return {
        _id: show._id,
        showDateTime: showDateTimeIso(show),
        showPrice: show.price,
        movie: getMovieById(show.movieId),
        totalBookings: showBookings.length,
        totalRevenue,
      }
    })
  }

  if (path.startsWith('/seats/show/') && method === 'GET') {
    const showId = path.split('/')[3]
    const seatsMap = ensureSeatMap()
    if (!seatsMap[showId]) {
      seatsMap[showId] = generateSeatsForShow(showId)
      write(SEATS_KEY, seatsMap)
    }
    return seatsMap[showId]
  }

  if (path === '/seats/init' && method === 'POST') {
    const user = withSessionUser()
    if (!user.isAdmin) throw new Error('Not authorized as an admin')
    const seatsMap = ensureSeatMap()
    const seats = []
    body.rows.forEach((row) => {
      for (let col = 1; col <= body.cols; col += 1) {
        seats.push({
          _id: `${body.showId}-${row}${col}`,
          showId: body.showId,
          seatNumber: `${row}${col}`,
          row,
          type: row === 'A' ? 'premium' : 'normal',
          status: 'available',
        })
      }
    })
    seatsMap[body.showId] = seats
    write(SEATS_KEY, seatsMap)
    return { message: `${seats.length} seats initialized` }
  }

  if (path === '/seats/reserve' && method === 'POST') {
    withSessionUser()
    const seatsMap = ensureSeatMap()
    const seats = seatsMap[body.showId] || generateSeatsForShow(body.showId)
    body.seatIds.forEach((seatId) => {
      const seat = seats.find((item) => item._id === seatId)
      if (seat) seat.status = 'reserved'
    })
    seatsMap[body.showId] = seats
    write(SEATS_KEY, seatsMap)
    return { message: 'Seats reserved for 10 minutes' }
  }

  if (path === '/payment/create-checkout-session' && method === 'POST') {
    const user = withSessionUser()
    const shows = seedShows()
    const seatsMap = ensureSeatMap()
    const bookings = seedBookings()
    const show = shows.find((item) => item._id === body.showId)
    if (!show) throw new Error('Show not found')

    const seats = (seatsMap[body.showId] || []).filter((seat) => body.seatIds.includes(seat._id))
    seats.forEach((seat) => {
      seat.status = 'booked'
    })
    seatsMap[body.showId] = seatsMap[body.showId] || []
    write(SEATS_KEY, seatsMap)

    const booking = {
      _id: `mock-booking-${Date.now()}`,
      userId: user._id,
      showId: show._id,
      movieId: show.movieId,
      seatIds: seats.map((seat) => ({ _id: seat._id, seatNumber: seat.seatNumber })),
      totalAmount: show.price * seats.length,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }
    bookings.unshift(booking)
    write(BOOKINGS_KEY, bookings)
    return { id: `mock-session-${Date.now()}`, url: '/mybookings' }
  }

  if (path === '/bookings/my' && method === 'GET') {
    const user = withSessionUser()
    const shows = seedShows()
    return seedBookings()
      .filter((booking) => booking.userId === user._id && booking.status === 'confirmed')
      .map((booking) => {
        const show = shows.find((item) => item._id === booking.showId)
        return {
          _id: booking._id,
          amount: booking.totalAmount,
          bookedSeats: booking.seatIds.map((seat) => seat.seatNumber),
          show: {
            _id: show?._id,
            showDateTime: show ? showDateTimeIso(show) : null,
            movie: getMovieById(booking.movieId),
          },
        }
      })
  }

  if (path === '/bookings/admin/list' && method === 'GET') {
    const user = withSessionUser()
    if (!user.isAdmin) throw new Error('Not authorized as an admin')
    const users = seedUsers()
    const shows = seedShows()
    return seedBookings().map((booking) => {
      const bookingUser = users.find((item) => item._id === booking.userId)
      const show = shows.find((item) => item._id === booking.showId)
      return {
        _id: booking._id,
        amount: booking.totalAmount,
        bookedSeats: booking.seatIds.map((seat) => seat.seatNumber),
        user: bookingUser ? { _id: bookingUser._id, name: bookingUser.name, email: bookingUser.email } : null,
        show: {
          _id: show?._id,
          showDateTime: show ? showDateTimeIso(show) : null,
          movie: getMovieById(booking.movieId),
        },
      }
    })
  }

  throw new Error(`Mock API route not implemented: ${method} ${path}`)
}
