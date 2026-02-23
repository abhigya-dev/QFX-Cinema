import React from 'react'
import { assets } from '../../assets/assets'
import { LayoutDashboardIcon, List, ListCollapse, LogOut, SquarePlus } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const SideBar = () => {
  const navigate = useNavigate()
  const { adminLogout, adminLoggingOut } = useAuth()

  const user = {
    firstName: 'Admin',
    lastName: 'User',
    imageUrl: assets.profile
  }

  const adminNavLinks = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: LayoutDashboardIcon
    },
    {
      name: 'Add Shows',
      path: '/admin/add-shows',
      icon: SquarePlus
    },
    {
      name: 'List Shows',
      path: '/admin/list-shows',
      icon: List
    },
    {
      name: 'List Bookings',
      path: '/admin/list-bookings',
      icon: ListCollapse
    }
  ]

  const handleAdminLogout = async () => {
    try {
      const didLogout = await adminLogout()
      if (!didLogout) return
      toast.success('Admin logged out')
      navigate('/auth/sign-in')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <aside className='fixed left-0 top-20 z-30 h-[calc(100vh-5rem)] w-20 md:w-64 border-r border-r-gray-700 bg-black px-2 md:px-4 py-6 flex flex-col'>
      <div className='mb-6 flex items-center justify-center md:justify-start gap-3 border-b border-b-gray-700 pb-4'>
        <img src={user.imageUrl} alt='admin profile' className='h-10 w-10 rounded-full object-cover' />
        <p className='hidden text-sm text-white md:block'>{`${user.firstName} ${user.lastName}`}</p>
      </div>

      <nav className='flex flex-col gap-2'>
        {adminNavLinks.map(({ name, path, icon }) => {
          const IconComponent = icon
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/admin'}
              className={({ isActive }) =>
                `flex items-center justify-center md:justify-start gap-3 rounded-lg px-2 md:px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-primary-dull text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <IconComponent size={18} />
              <span className='hidden md:inline'>{name}</span>
            </NavLink>
          )
        })}
      </nav>

      <button
        type='button'
        onClick={handleAdminLogout}
        disabled={adminLoggingOut}
        className='mt-auto flex items-center justify-center md:justify-start gap-3 rounded-lg px-2 md:px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200 cursor-pointer'
      >
        <LogOut size={18} />
        <span className='hidden md:inline'>{adminLoggingOut ? 'Logging out...' : 'Admin Logout'}</span>
      </button>
    </aside>
  )
}

export default SideBar
