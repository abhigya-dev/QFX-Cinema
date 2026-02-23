import { Link } from 'react-router-dom'

const BookingCancel = () => {
  return (
    <div className='min-h-screen flex items-center justify-center px-6'>
      <div className='max-w-md text-center rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-6'>
        <h1 className='text-2xl font-bold'>Payment Cancelled</h1>
        <p className='mt-3 text-gray-300'>Your checkout was cancelled. You can try again any time.</p>
        <div className='mt-5 flex justify-center gap-3'>
          <Link to='/movies' className='bg-primary-dull px-4 py-2 rounded-md'>Try Again</Link>
          <Link to='/' className='border border-primary-dull px-4 py-2 rounded-md'>Go Home</Link>
        </div>
      </div>
    </div>
  )
}

export default BookingCancel
