import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const RequireCustomer = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className='px-6 py-24 text-center'>Checking access...</div>
  }

  if (!user || user?.isAdmin) {
    return (
      <Navigate
        to='/auth/sign-in'
        replace
        state={{
          from: location.pathname,
          reason: user?.isAdmin ? 'admin_session' : 'auth_required',
        }}
      />
    )
  }

  return children
}

export default RequireCustomer
