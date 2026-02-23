import React, { useState } from 'react'
import ReactPlayer from 'react-player'
import {dummyTrailers } from "../assets/assets"
import blurSvg from "../assets/blur.svg"
import { PlayIcon } from 'lucide-react'

const MovieTrailer = () => {
    const [currentTrailer,setcurrentTrailer]=useState(dummyTrailers[0])
  return (
    <div className='flex flex-col px-5 py-8 lg:px-30 lg:py-20 gap-8 relative'>
      <img src={blurSvg} alt="" className='absolute -top-8 w-45 h-60 right-1 lg:w-70 lg:h-70'/>
      <h1 className='px-5 text-gray-300 text-xl font-bold lg:px-20'>Trailers</h1>
      
      <div className="relative  w-full  h-90 lg:w-[80%] lg:h-130  rounded-md flex lg:mx-auto">
        <ReactPlayer
          src={currentTrailer.videoUrl}
        
          width="100%"
          height="100%"
        />
      </div>

      <div className=' grid md:grid-cols-3 grid-cols-2 lg:grid-cols-4 gap-5 h-40 w-[70%] justify-items-center   mx-auto'>
   {
            dummyTrailers.map((trailers)=>(
                <div className={` relative  border-0 rounded-md h-full w-full bg-no-repeat cursor-pointer transform transition-all duration-300 hover:-translate-y-2 brightness-75`}
                  key={trailers.videoUrl}
                    style={{
                        backgroundImage: `url(${trailers.image})`,
                        backgroundSize: "contain",
                        backgroundPosition: "bottom",
                    }}
                    onClick={(e)=>{
                        e.preventDefault();
                        setcurrentTrailer(trailers)
                    }}
                    >
                    <PlayIcon className=' absolute top-7 left-10 lg:top-23 lg:left-20 ' size={20}/>
                </div>
            ))
        }
      </div>
    </div>
  )
}

export default MovieTrailer
