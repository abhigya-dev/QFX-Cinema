import React from 'react'

const Title = ({text1,text2}) => {
  return (
    <div>
      <h1 className='font-bold text-2xl'>{text1} <span className='text-2xl font-bold text-red-400 underline'>{text2}</span></h1>
    </div>
  )
}

export default Title
