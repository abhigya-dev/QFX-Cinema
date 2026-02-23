import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { ChevronDown, Menu, Search, Settings, Ticket, UserCircle2, X, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, isClientAuthenticated, logout, loggingOut } = useAuth()
  const dropdownRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      const didLogout = await logout()
      if (!didLogout) return
      toast.success('Logged out')
      setProfileMenuOpen(false)
      navigate('/')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <header className='fixed left-0 top-0 z-50 w-full bg-transparent'>
      <div className='flex items-center justify-between px-6 py-5 md:px-18'>
        <Link to='/'>
          <img src={assets.logo} alt='logo' className='w-50 md:w-60' />
        </Link>

        <div className='hidden gap-8 rounded-full border border-white/20 bg-white/10 px-6 py-3 shadow-lg backdrop-blur-md lg:flex'>
          <Link to='/'>Home</Link>
          <Link to='/movies'>Movie</Link>
          <Link to='/movies'>Theaters</Link>
          <Link to='/movies'>Releases</Link>
          {isClientAuthenticated && <Link to='/favorites'>Favorites</Link>}
          {isClientAuthenticated && <Link to='/mybookings'>My Bookings</Link>}
        </div>

        <div className='flex items-center justify-center gap-5 max-md:px-4'>
          <Search className='hidden lg:block' />

          {!isClientAuthenticated && (
            <button
              className='cursor-pointer rounded-full bg-primary-dull px-4 py-2 text-white md:px-6'
              onClick={() => navigate('/auth/sign-in')}
            >
              Login
            </button>
          )}

          {isClientAuthenticated && (
            <div className='relative' ref={dropdownRef}>
              <button
                className='flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm backdrop-blur-md'
                onClick={() => setProfileMenuOpen((prev) => !prev)}
              >
                <img
                  src={user?.imageUrl || assets.profile}
                  alt='profile'
                  className='h-7 w-7 rounded-full object-cover border border-white/20'
                />
                <p className='max-w-32 truncate'>Hi, {user?.name || 'User'}</p>
                <ChevronDown size={16} />
              </button>

              {profileMenuOpen && (
                <div className='absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-white/15 bg-[#121212] shadow-2xl'>
                  <button
                    className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-white/10'
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/mybookings')
                    }}
                  >
                    <Ticket size={16} /> My Booking
                  </button>
                  <button
                    className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-white/10'
                    onClick={() => {
                      setProfileMenuOpen(false)
                      navigate('/settings')
                    }}
                  >
                    <Settings size={16} /> Settings
                  </button>
                  <button
                    className='flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-300 hover:bg-white/10'
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <LogOut size={16} /> {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={(e) => {
              e.preventDefault()
              setMenuOpen(!menuOpen)
            }}
          >
            {menuOpen ? <X className='block lg:hidden' /> : <Menu className='block lg:hidden' />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className='flex flex-col space-y-4 border-t border-white/20 bg-black/60 px-6 py-6 backdrop-blur-md md:hidden'>
          <Link onClick={() => setMenuOpen(false)} to='/'>Home</Link>
          <Link onClick={() => setMenuOpen(false)} to='/movies'>Movie</Link>
          <Link onClick={() => setMenuOpen(false)} to='/movies'>Theaters</Link>
          <Link onClick={() => setMenuOpen(false)} to='/movies'>Releases</Link>
          {isClientAuthenticated && <Link onClick={() => setMenuOpen(false)} to='/favorites'>Favorites</Link>}
          {isClientAuthenticated && <Link onClick={() => setMenuOpen(false)} to='/mybookings'>My Bookings</Link>}
          {isClientAuthenticated && (
            <Link onClick={() => setMenuOpen(false)} to='/settings' className='inline-flex items-center gap-2'>
              <UserCircle2 size={16} />
              Settings
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
