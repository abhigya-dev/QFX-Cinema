import { Star } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import timeFormat from '../lib/timeFormat'

const MovieCard = ({ movieDetail, compact = false, home = false }) => {
  const navigate=useNavigate()
  const handleBuyTicket=()=>{
    navigate(`/movies/${movieDetail._id}`)
    scrollTo(0,0)

  }
  const imageSrc = movieDetail.backdrop_path || movieDetail.poster_path

  if (compact) {
    return (
      <div className='overflow-hidden rounded-2xl border border-white/10 bg-[#101317]'>
        <button type='button' className='relative block h-44 w-full cursor-pointer' onClick={handleBuyTicket}>
          <img src={imageSrc} alt={movieDetail.title} className='h-full w-full object-cover' />
          <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent' />
          <p className='absolute bottom-3 left-3 line-clamp-1 text-base font-semibold text-white'>
            {movieDetail.title}
          </p>
        </button>
        <div className='relative space-y-3 p-3 pt-14'>
          <img
            src={movieDetail.poster_path || imageSrc}
            alt={`${movieDetail.title} poster`}
            className='absolute -top-12 left-3 h-24 w-16 rounded-md border border-white/20 object-cover shadow-md'
          />
          <p className='line-clamp-1 text-sm text-gray-300'>
            {(movieDetail.release_date || '').split('-')[0]} &bull; {(movieDetail.genres || [])
              .slice(0, 2)
              .map((genre) => genre.name)
              .join(' | ')} &bull; {timeFormat(movieDetail.runtime || 0)}
          </p>
          <div className='flex items-center justify-between'>
            <button
              className='rounded-full bg-primary-dull px-3 py-1.5 text-xs font-medium cursor-pointer'
              onClick={handleBuyTicket}
            >
              Buy Tickets
            </button>
            <div className='text-right'>
              <p className='flex items-center justify-end gap-1.5 text-sm'>
                <Star size={15} color='#D63858' fill='#D63858' />
                {(movieDetail.vote_average || 0).toFixed(1)}
              </p>
              {movieDetail.showPrice !== null && (
                <p className='mt-1 inline-flex rounded-full bg-primary-dull/20 px-2 py-0.5 text-xs font-semibold text-primary-dull'>
                  Ticket ${Number(movieDetail.showPrice).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-md bg-gray-800 flex flex-col ${home ? 'p-3 gap-3' : 'p-4 gap-5'} `}>
                <div className={`relative ${home ? '' : ''}`}>
                  <img
                    src={imageSrc}
                    alt=""
                    className={`rounded-md w-full object-cover ${home ? 'h-40 sm:h-44 md:h-46 lg:h-48' : 'h-44 sm:h-48 md:h-52 lg:h-56'}`}
                    onClick={handleBuyTicket}
                  />
                  {home && (
                    <>
                      <div className='absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-black/90 to-transparent' />
                      <h1 className='absolute bottom-2 left-3 right-3 line-clamp-1 font-bold text-md text-white'>
                        {movieDetail.title}
                      </h1>
                    </>
                  )}
                </div>
                {!home && <h1 className='font-bold text-md'>{movieDetail.title}</h1>}
                <p className='flex items-center text-gray-300'>{(movieDetail.release_date || '').split("-")[0]} &bull; {(movieDetail.genres || []).slice(0,2).map((genre)=>(
                    genre.name
                )).join(" | ")} &bull; {timeFormat(movieDetail.runtime || 0)}</p>

                <div className='flex justify-between '>
                 <button className='px-2 py-1 bg-primary-dull rounded-full text-sm cursor-pointer'
                 onClick={handleBuyTicket}
                 >Buy Tickets</button>
                 <div className='text-right'>
                   <p className='flex gap-2 items-center justify-end'><Star size={18} color='#D63858' fill='#D63858'/>{(movieDetail.vote_average || 0).toFixed(1) }</p>
                   {movieDetail.showPrice !== null && (
                     <p className='mt-1 inline-flex rounded-full bg-primary-dull/20 px-2 py-0.5 text-xs font-semibold text-primary-dull'>
                       Ticket ${Number(movieDetail.showPrice).toFixed(2)}
                     </p>
                   )}
                 </div>
                </div>
               
            </div>
  )
}

export default MovieCard
