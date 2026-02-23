import React from 'react'
import { assets } from '../assets/assets'
import { ArrowRight, Calendar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
    const navigate=useNavigate();
    
  return (
    <div className=' flex flex-col  items-start justify-center  bg-[url("/backgroundImage.png")] bg-cover bg-center  h-screen gap-4 md:gap-6 px-8 md:px-25 py-7'>
   <img src={assets.marvelLogo} alt="marvallogo"/>
    <h1 className=' text-[2.8rem] leading-14 font-extrabold md:text-[4rem] md:font-bold md:leading-20 '> Guardians <br/> of the Galaxy</h1>
    <div className='flex gap-2 lg:gap-5 items-center'>
        <p className=' text-gray-300 text-sm' >Action | Adventure | Sci-Fi </p>
        <p className='flex items-center gap-2 text-sm  text-gray-300'><Calendar/> 2026</p>
        <p className='flex item-center gap-2 text-gray-300 text-sm'><Clock/> 2h 8m</p>
    </div>
    <p className='max-w-md text-gray-300'>
        In a post-apocalyptic world where cities ride on wheels and consume each other to survive, two people meet in London and try to stop a conspiracy.
    </p>

    <button className='bg-primary-dull font-bold px-8 py-3 flex gap-2 rounded-full'
    onClick={(e)=>{
        e.preventDefault();
        navigate("/movies")
    }}
    >Explore Movies <ArrowRight/></button>
      
    </div>
  )
}

export default HeroSection
