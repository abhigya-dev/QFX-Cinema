import React, { useEffect, useState } from 'react'
import Title from '../../Components/admin/Title'

import { ChartLine, CircleDollarSign, CirclePlay, Star, Users } from 'lucide-react'
import DashBoardCard from '../../Components/admin/DashBoardCard'
import currencyFormat from '../../lib/currencyFormat'
import dateTimeFormat from '../../lib/showDate-Timefotmat'
import Loader from "../../Components/Loader" 
import { api } from '../../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
  const [dashboardData,setDashboardData]=useState(null)
  const [activeShows, setActiveShows] = useState([])
  const [loading,setLoading]=useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    const fetchDashboardData=async()=>{
      try {
        const [summary, shows] = await Promise.all([
          api.get('/shows/admin/dashboard'),
          api.get('/shows/admin/list')
        ])
        setDashboardData(summary);
        setActiveShows(shows || [])

      } catch (error) {
        if (error.message.toLowerCase().includes('not authorized')) {
          toast.error('Admin login required')
          navigate('/auth/sign-in')
          return
        }
        toast.error(error.message);
      } finally {
        setLoading(false); 
      }
    }

    fetchDashboardData();
  },[navigate])
    const dashboardCard=[
      {title:"Total Bookings", value:dashboardData?.totalBookings ||0, icon:ChartLine},  
      {title:"Total Revenue", value:dashboardData?.totalRevenue ||0 ,icon:CircleDollarSign},
      {title:"Total Users", value:dashboardData?.totalUser ||0 ,icon: Users },
      {title:"Active Shows", value:dashboardData?.activeShows ||0, icon:CirclePlay },
    ]

  if(loading){
    return <Loader/>
  }

  return (
   <>
    <Title text1={"Admin"} text2={"Dashboard"}/>
    <div className=' mt-10'>
      <div className='grid lg:grid-cols-5 md:grid-cols-3 grid-cols-1 lg:gap-10 gap-3'>
        {
        !loading && dashboardCard?.map(({title,value ,icon})=>(
              <DashBoardCard key={title} title={title} value={ title=='Total Revenue'? currencyFormat(value):value} icon={icon}/>
          ))
        }
      </div>

      {/* active show */}
      <div className='flex flex-col mt-7 py-5 text-lg'>
      <h1 className='font-semibold'>Active Shows</h1>

      <div className='grid lg:grid-cols-4 sm:grid-cols-1 md:grid-cols-3 gap-8 py-10 '>
      {
        activeShows?.slice(0, 8).map((show)=>(
          <div key={show._id} className='flex flex-col rounded-xl border border-primary-dull/20 overflow-hidden bg-primary-dull/15'>
          <div  className='h-70 aspect-square'>
            <img src={show.movie?.poster || show.movie?.poster_path} alt="movieposter" className='object-cover h-full w-full'/>
          </div>
          <div className='flex flex-col px-4 py-3 gap-2 justify-between'>
           <h1 className='text-fit'>{show.movie?.title}</h1>
           <div className='flex justify-between'>
           <p>{currencyFormat(show.showPrice)}</p>
           <p className='flex gap-2 items-center text-gray-400 text-sm'><Star size={15} fill='#D63858' color='#D63858' />{(show.movie?.rating || show.movie?.vote_average || 0).toFixed(1)}</p>

           </div>
           <p className='text-gray-400 text-sm'>{dateTimeFormat(show.nextShowDateTime)}</p>
           <p className='text-gray-400 text-xs'>{show.activeShowCount} upcoming slot(s)</p>
            
          </div>
          

          </div>
        ))
      }

      </div>
      </div>

    </div>
   </>
  )
}

export default Dashboard
