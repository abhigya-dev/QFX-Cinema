import React from 'react'
import { assets } from '../../assets/assets'

const TopBar = () => {
  return (
    <div className=' bg-black px-10 py-3 border-b border-b-gray-700 overflow-hidden fixed top-0 right-0 left-0 z-50'>
     <img src={assets.logo} alt="logo" className=' w-50 md:w-60 '/>

    </div>
  )
}

export default TopBar
