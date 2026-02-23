import React, { useEffect, useState } from 'react'
import blurSvg from "../assets/blur.svg"
import  MovieCard  from  "../Components/MovieCard"
import { api } from '../lib/api'
import { normalizeMovie } from '../lib/normalizers'
import Loader from '../Components/Loader'

const Movies = () => {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const payload = await api.get('/movies/now-showing')
        const normalized = (payload || []).map(normalizeMovie)
        const unique = []
        const seen = new Set()
        normalized.forEach((movie) => {
          const key = String(movie.title || '').trim().toLowerCase()
          if (!key || seen.has(key)) return
          seen.add(key)
          unique.push(movie)
        })
        setMovies(unique)
      } catch {
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  if (loading) {
    return <Loader />
  }

  if(!loading && movies.length===0){
   return (
      <div className='flex min-h-screen items-center justify-center px-6 text-center'>
        <h1 className='text-2xl font-bold'>Opps ! No Show Available</h1>
      </div>
    )
      

  }

  return (
    <div className='relative flex flex-col gap-4 overflow-hidden px-5 py-25 lg:px-30 lg:py-30'>
    <img src={blurSvg} alt="" className='absolute top-30 w-45 h-90 -left-20 lg:w-90 lg:h-90'/>
        <img src={blurSvg} alt="" className='absolute bottom-0  w-45 h-90 -right-10 lg:w-90 lg:h-90'/>

    
     <h1 className='text-gray-300 text-lg font-bold'>Now Showing</h1>

     <div className='z-30 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4'>
    {
        movies.map((show)=>(
          <MovieCard key={show._id} movieDetail={show}/>
        ))
    }
     </div>
    </div>
  )
}

export default Movies
