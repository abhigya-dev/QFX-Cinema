
import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import blurSvg from "../assets/blur.svg";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const SelectDate = ({showDate,id}) => {
  const [selectDate,setSelectDate]=useState(null)
  const [dateStartIndex,setdateStartIndex]=useState(0)
  const navigate=useNavigate();
  const { user } = useAuth()
  const getTodayLocalKey = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const availableDates = useMemo(() => {
    const todayKey = getTodayLocalKey()
    return Object.keys(showDate || {})
      .filter((dateKey) => (showDate?.[dateKey] || []).length > 0)
      .filter((dateKey) => dateKey >= todayKey)
      .sort()
  }, [showDate])
  const activeDate = availableDates.includes(selectDate) ? selectDate : null
  const safeStartIndex = Math.min(dateStartIndex, Math.max(0, availableDates.length - 3))

  const getDisplayDate = (isoDate) => {
    const [year, month, day] = String(isoDate).split('-').map(Number)
    if (!year || !month || !day) {
      return { day: '--', month: '--' }
    }
    const localDate = new Date(year, month - 1, day)
    return {
      day: localDate.getDate(),
      month: localDate.toLocaleString('en-US', { month: 'short' }),
    }
  }

  const handleBookNow=()=>{
    if (user?.isAdmin) {
      toast.error('Please sign in with a user account to book tickets')
      navigate('/auth/sign-in', { state: { reason: 'admin_session' } })
      return
    }

    if(!navigateDate){
      toast.error('No available future date/time');
      return
    }
    if(!selectDate){
      toast.error('Please Select Date First');
    }else{

      navigate(`/movies/${id}/${navigateDate}`)
    }
  }
  const navigateDate = selectDate




  return (
    <div id="selectDate" className='relative  lg:py-20 overflow-hidden '>
    <img src={blurSvg} alt="" className='absolute lg:-top-14 top-0 w-45 h-60 left-2 lg:-left-20 lg:w-50 lg:h-60 object-cover' />
    <img
  src={blurSvg}
  alt=""
  className=" absolute bottom-0 right-0 w-[11rem] h-[15rem] object-cover lg:-bottom-10 lg:-right-10 lg:w-[12.5rem] lg:h-[15rem]
  "
/>
       <div className='w-full  bg-primary-dull/15 flex flex-col gap-7 lg:gap-5 lg:px-10 lg:py-10 border border-primary-dull/40 rounded-md px-5 py-10 '>
       <p className='font-bold text-lg'>Choose Date</p>
       <div className='flex flex-col items-center lg:justify-between lg:flex-row  z-30 gap-7'>
       <div className='flex gap-4 items-center cursor-pointer col-span-4'>
       <ChevronLeft onClick={(e)=>{
        e.preventDefault();
        if(safeStartIndex > 0){
          setdateStartIndex(safeStartIndex-1)
        }
       }}/>
        {
            availableDates.slice(safeStartIndex,safeStartIndex+3).map((date,index)=>{
                const display = getDisplayDate(date)
                return <div key={index} className={`flex flex-col  border border-primary-dull px-3 py-1 rounded-md items-center cursor-pointer ${activeDate===date?'bg-primary-dull':''}`} onClick={(e)=>{
                  e.preventDefault();
                  setSelectDate(date)
                }}>
                    <p>{display.day}</p>
                    <p>{display.month}</p>
                </div>
            })
        }
        <ChevronRight onClick={(e)=>{
        e.preventDefault();
        if(safeStartIndex+3 < availableDates.length){
          setdateStartIndex(safeStartIndex+1)
        }
       }}/>

       </div>
       {availableDates.length === 0 && (
        <p className='text-sm text-gray-400'>No show dates available right now.</p>
       )}
       <button className='bg-primary-dull px-4 py-2 rounded-md cursor-pointer '
       onClick={handleBookNow}
       disabled={availableDates.length === 0 || !navigateDate}
       >
           Book Now
       </button>
       </div>

       </div>
      
    </div>
  )
}

export default SelectDate
