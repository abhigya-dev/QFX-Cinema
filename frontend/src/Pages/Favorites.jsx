import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../Components/MovieCard'
import { useAuth } from '../context/AuthContext'
import { getFavoriteMovieIds } from '../lib/favorites'
import { api } from '../lib/api'
import { normalizeMovie } from '../lib/normalizers'

const Favorites = () => {
  const navigate = useNavigate()
  const { isClientAuthenticated, user } = useAuth()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFavorites = async () => {
      if (!isClientAuthenticated || !user?._id) {
        navigate('/auth/sign-in')
        return
      }

      try {
        const favoriteIds = getFavoriteMovieIds(user._id)
        if (favoriteIds.length === 0) {
          setMovies([])
          return
        }
        const allMovies = await api.get('/movies')
        const normalized = (allMovies || []).map(normalizeMovie)
        setMovies(normalized.filter((movie) => favoriteIds.includes(movie._id)))
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [isClientAuthenticated, navigate, user?._id])

  if (loading) {
    return <div className='px-6 py-24 text-center'>Loading favorites...</div>
  }

  return (
    <div className='px-6 py-24 lg:px-24'>
      <h1 className='text-2xl font-bold mb-6'>My Favorites</h1>
      {movies.length === 0 ? (
        <p className='text-gray-400'>No favorite movies yet.</p>
      ) : (
        <div className='grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-5'>
          {movies.map((movie) => (
            <MovieCard key={movie._id} movieDetail={movie} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Favorites
