import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { Menu, Search, X } from "lucide-react";
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const [menuOpen,setmenuOpen]=useState(false);
  const navigate=useNavigate();
  const { isClientAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
      navigate('/');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
   <>
   <header className='fixed top-0 left-0 w-full z-50 bg-transparent' >
    <div className='flex justify-between items-center  px-6  md:px-18 py-5'>
    <Link to='/'>
      <img src={assets.logo} alt="logo" className=' w-50 md:w-60 '/>
    </Link>

    <div className=' hidden  gap-8 px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg lg:flex'>
     
        <Link to='/' onClick={()=>{
          scrollTo(0,0)
        }}>Home</Link>
        <Link to='/movies' onClick={()=>{
          scrollTo(0,0)
        }}>Movie</Link>
        <Link onClick={()=>{
          scrollTo(0,0)
        }}>Theaters</Link>
        <Link onClick={()=>{
          scrollTo(0,0)
        }}>Releases</Link>
        {isClientAuthenticated && <Link to="/favorites" onClick={()=>{
          scrollTo(0,0)
        }}>Favorites</Link>}
        {isClientAuthenticated && <Link to='/mybookings'>My Bookings</Link>}
        
        
     
    </div>

    <div className='flex gap-5 justify-center items-center max-md:px-4'>
    <Search className=' hidden lg:block'/>

    {!isClientAuthenticated && (
      <button
        className='bg-primary-dull text-white px-4 py-2 rounded-full cursor-pointer md:px-6'
        onClick={() => navigate('/auth/sign-in')}
      >
        Login
      </button>
    )}

    {isClientAuthenticated && (
      <button
        className='bg-primary-dull text-white px-4 py-2 rounded-full cursor-pointer md:px-6'
        onClick={handleLogout}
      >
        Logout
      </button>
    )}
   
    <button onClick={(e)=>{
      e.preventDefault();
      setmenuOpen(!menuOpen);

    }}>
    {menuOpen ? <X className=" block lg:hidden"/> : <Menu className='block lg:hidden' />}

    </button>

    </div>

  


    </div>
      {
      menuOpen &&
      <div className='md:hidden  flex flex-col px-6 py-6 space-y-4 
          bg-black/60 backdrop-blur-md border-t border-white/20'>
         <Link  onClick={()=>{ setmenuOpen(false);}} to='/'>Home</Link>

         <Link  onClick={()=>{setmenuOpen(false);}}  to='/movies'>Movie</Link>

         <Link  onClick={()=>{setmenuOpen(false);}} >Theaters</Link>

         <Link  onClick={()=>{setmenuOpen(false);}} >Releases</Link>

         {isClientAuthenticated && <Link  onClick={()=>{setmenuOpen(false);}} to="/favorites">Favorites</Link>}
         {isClientAuthenticated && <Link onClick={()=>{setmenuOpen(false)}} to='/mybookings'>My Bookings</Link>}
      </div>
    }

   </header>
   </>
  )
}

export default Navbar
