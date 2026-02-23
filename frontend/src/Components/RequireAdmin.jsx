import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminSignInPage from '../Pages/auth/AdminSignInPage'

const RequireAdmin = ({ children }) => {
  const { adminUser, loading, isAdminAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className='px-6 py-24 text-center'>Checking admin access...</div>
  }

  if (!isAdminAuthenticated) {
    if (location.pathname === '/admin') {
      return <AdminSignInPage />
    }
    return <Navigate to='/admin' replace state={{ from: location.pathname }} />
  }

  if (!adminUser?.isAdmin) {
    if (location.pathname === '/admin') {
      return <AdminSignInPage />
    }
    return <Navigate to='/admin' replace state={{ from: location.pathname, reason: 'admin_required' }} />
  }

  return children
}

export default RequireAdmin
