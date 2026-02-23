import React, { useEffect, useState } from 'react'
import { ArrowRight} from 'lucide-react'
import MovieCard from './MovieCard'
import { Link, useNavigate } from 'react-router-dom'
import blurSvg from "../assets/blur.svg"
import { api } from '../lib/api'
import { normalizeMovie } from '../lib/normalizers'

const FeaturedSection = () => {
    const navigate =useNavigate();
    const [movies, setMovies] = useState([])

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
        }
      }

      fetchMovies()
    }, [])

    const hnadleShowMore=()=>{
        navigate('/movies')

    }
  return (
    <div className='flex flex-col relative'>
    <img src={blurSvg} alt="" className='absolute -top-10 w-45 h-60 right-1 lg:w-64 lg:h-64' />
      <div className='flex justify-between items-center text-md text-gray-300 px-5 md:px-30 pt-20'>
        <p className='font-bold text-lg'>Now Showing</p>
        <Link to={"/movies"}>

        <p className='flex items-center gap-2  text-sm'>View All <ArrowRight size={15}/></p>
        </Link>
      </div>
      <div className='grid grid-cols-1 px-5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-5 md:px-30 py-14'>
      {
        movies.slice(0,6).map((movieDetail)=>(
            <MovieCard key={movieDetail._id} movieDetail={movieDetail} home />
        ))
      }
       
      </div>
      <button className='flex self-center bg-primary-dull px-4 py-2 rounded-md cursor-pointer m-8' onClick={hnadleShowMore}>Show more</button>
    </div>
  )
}

export default FeaturedSection
