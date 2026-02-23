import React from 'react'

const DashBoardCard = ({title,value,icon}) => {
  const IconComponent = icon
  return (
    <div className='flex items-center  justify-between px-5 py-2 gap-7 bg-primary-dull/15 border border-primary-dull/40 rounded-xl'>
    <div className='flex flex-col items-start gap-2'>
        <h1 className='text-sm'>{title}</h1>
        <p className='font-bold text-lg'>{value}</p>
    </div>
     <IconComponent size={25}/>

      
    </div>
  )
}

export default DashBoardCard
