import React, { useEffect, useState } from 'react'
import Title from '../../Components/admin/Title'
import dateTimeFormat from '../../lib/showDate-Timefotmat'
import currencyFormat from '../../lib/currencyFormat'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Loader from '../../Components/Loader'


const ListShows = () => {
  const [listShows,setlistShows]=useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    const fetchListShows=async()=>{
      try {
        const payload = await api.get('/shows/admin/list')
        setlistShows(payload || [])
      } catch (error) {
        if (error.message.toLowerCase().includes('not authorized')) {
          toast.error('Admin login required')
          navigate('/auth/sign-in')
          return
        }
        toast.error(error.message)
        setlistShows([])
      } finally {
        setLoading(false)
      }
    }

    fetchListShows();
  },[navigate])

  if(loading){
    return <Loader />
  }

  if(listShows?.length==0){
    return(
      <h1>No List Show Data</h1>
    )
  }


    return (
      <>
            <Title text1={"List"} text2={"Shows"}/>
            <div className='mt-10 w-full rounded-lg overflow-x-auto'>

           <table className=' text-left border-collapse '>
           <thead className='bg-primary-dull/20 '>
            <tr >
              <th className='lg:pr-14 pr-10 pl-3 py-3 ml-6'>Movie Name</th>
              <th className='pr-14 pl-3 py-3 mx-6'>Next Show Time</th>
              <th className='pr-14 pl-3 py-3 mx-6'>Upcoming Slots</th>
              <th className='pr-14 lg:pl-3 pl-10 py-3 mx-6'>Total Bookings</th>
              <th className='pr-14 pl-3 py-3 mx-6'>Earnings</th>
            </tr>
           </thead>
         

           
           <tbody>
            {
              listShows?.map((list,index)=>(
                <tr key={list._id} className={`${index % 2==0 ? "bg-primary-dull/10":"bg-primary-dull/15"} `} >
                  <td className='lg:pr-20 pr-10 lg:pl-3 pl-5 py-3  text-sm'>{list.movie?.title}</td>
                  <td className='lg:pr-14 lg:pl-3  py-3 text-sm'>{dateTimeFormat(list.nextShowDateTime)}</td>
                  <td className='pr-14 pl-3 py-3 text-sm'>{list.activeShowCount}</td>
                  <td className='pr-14 lg:pl-3  pl-10 py-3  text-sm'>{list.totalBookings}</td>
                  <td className='pr-14 pl-3 py-3 text-sm'>{currencyFormat(list.totalRevenue)}</td>
                </tr>
              ))
            }
           </tbody>

           </table>
            </div>

      </>
  )
}

export default ListShows
