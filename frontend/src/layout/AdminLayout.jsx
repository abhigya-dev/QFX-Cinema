import React from 'react'
import TopBar from '../Components/admin/TopBar'
import SideBar from '../Components/admin/SideBar'
import { Outlet } from 'react-router-dom'

const AdminLayout = () => {
  return (
    <>
      <TopBar />
      <div className='min-h-screen pt-24'>
        <SideBar />
        <main className='w-full max-w-full overflow-x-hidden px-4 pb-8 pt-2 pl-24 sm:px-6 md:px-10 md:pl-72'>
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default AdminLayout
