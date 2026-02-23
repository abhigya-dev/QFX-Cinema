import React, { useEffect, useState } from 'react'
import Title from '../../Components/admin/Title'
import dateTimeFormat from '../../lib/showDate-Timefotmat'
import currencyFormat from '../../lib/currencyFormat'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Loader from '../../Components/Loader'

const ListBookings = () => {

  const [listBooking,setlistBooking]=useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    const fetchListBooking=async()=>{
      try {
        const payload = await api.get('/bookings/admin/list')
        setlistBooking(payload || [])
      } catch (error) {
        if (error.message.toLowerCase().includes('not authorized')) {
          toast.error('Admin login required')
          navigate('/auth/sign-in')
          return
        }
        toast.error(error.message)
        setlistBooking([])
      } finally {
        setLoading(false)
      }
    }

    fetchListBooking();
  },[navigate])

  if(loading){
    return <Loader />
  }

  if(listBooking?.length==0){
    return(
      <h1>No data found for listBooking</h1>
    )
  }
  return (
   <>
    <Title text1={"List"} text2={"Booking"}/>
    <div className='mt-10 w-full rounded-lg overflow-x-auto'>
      <table className='border-collapse'>
        <thead>
          <tr className='bg-primary-dull/20'>
            <th className='pr-14 pl-3 py-3 ml-6'>User Name</th>
            <th className='pr-14 pl-3 py-3 ml-6'>Movie Name</th>
            <th className='pr-14 pl-3 py-3 ml-6'>Show Time</th>
            <th className='pr-14 pl-3 py-3 ml-6'>Seats</th>
            <th className='pr-14 pl-3 py-3 ml-6'>Amount</th>
          </tr>
        </thead>
        <tbody>
        {
          listBooking?.map((list,index)=>(
            <tr key={list._id} className={`${index % 2==0 ? "bg-primary-dull/10":"bg-primary-dull/15"} `}>
              <td className='pr-20 pl-3 py-3  text-sm'>{list.user?.name}</td>
              <td className='lg:pr-20 pr-10 max-w-fit pl-3 py-3 text-xs lg:text-sm'>{list.show?.movie?.title}</td>
              <td className='lg:pr-20 lg:pl-3 py-3  text-sm'>{dateTimeFormat( list.show?.showDateTime)}</td>
              <td className='lg:pr-20 lg:pl-3 lg:py-3 pl-10 text-sm'>{list.bookedSeats.join(" , ")}</td>
              <td className='pr-20 pl-3 py-3  text-sm'>{currencyFormat( list.amount)}</td>
            </tr>
          ))
        }

        </tbody>
      </table>
    </div>
   </>
  )
}

export default ListBookings
