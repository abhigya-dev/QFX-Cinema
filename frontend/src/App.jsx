import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useEffect } from "react"
import HomePage from "./Pages/HomePage"
import Navbar from "./Components/Navbar"
import Movies from "./Pages/Movies"
import MovieDetail from "./Pages/MovieDetail"
import SeatLayout from "./Pages/SeatLayout"
import MyBookings from "./Pages/MyBookings"
import Favorites from "./Pages/Favorites"
import Footer from "./Components/Footer"
import PageNotFound from "./Pages/PageNotFound"
import {Toaster} from "react-hot-toast"
import AdminLayout from "./layout/AdminLayout"
import Dashboard from "./Pages/admin/Dashboard"
import AddShows from "./Pages/admin/AddShows"
import ListBookings from "./Pages/admin/ListBookings"
import ListShows from "./Pages/admin/ListShows"
import SignInPage from "./Pages/auth/SignInPage"
import SignUpPage from "./Pages/auth/SignUpPage"
import ForgotPasswordPage from "./Pages/auth/ForgotPasswordPage"
import ResetPasswordPage from "./Pages/auth/ResetPasswordPage"
import RequireAdmin from "./Components/RequireAdmin"
import RequireCustomer from "./Components/RequireCustomer"
import BookingSuccess from "./Pages/BookingSuccess"
import BookingCancel from "./Pages/BookingCancel"
import Settings from "./Pages/Settings"

function App() {

  const location = useLocation()
  const pathname = location.pathname
  const isAdminRoute = pathname.startsWith("/admin")
  const isAuthRoute = pathname.startsWith("/auth")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
    <Toaster/>
   {!isAdminRoute && !isAuthRoute && <Navbar/>}
     <Routes>
    <Route path='/' element={<HomePage/>}/>
    <Route path='/movies' element={<Movies/>}/>
    <Route path='/movies/:id' element={<MovieDetail/>}/>
    <Route path='/movies/:id/:date' element={<RequireCustomer><SeatLayout/></RequireCustomer>}/>
    <Route path='/mybookings' element={<RequireCustomer><MyBookings/></RequireCustomer>}/>
    <Route path='/favorites' element={<RequireCustomer><Favorites/></RequireCustomer>}/>
    <Route path='/settings' element={<RequireCustomer><Settings/></RequireCustomer>}/>
    <Route path='/auth/sign-in' element={<SignInPage/>}/>
    <Route path='/auth/sign-up' element={<SignUpPage/>}/>
    <Route path='/auth/forgot-password' element={<ForgotPasswordPage/>}/>
    <Route path='/admin/sign-in' element={<Navigate to='/admin' replace/>}/>
    <Route path='/reset-password/:token' element={<ResetPasswordPage/>}/>
    <Route path='/booking/success' element={<BookingSuccess/>}/>
    <Route path='/booking/cancel' element={<BookingCancel/>}/>
    <Route path='/*' element={<PageNotFound/>}/>
    <Route path="/admin" element={<RequireAdmin><AdminLayout/></RequireAdmin>}>
    <Route index element={<Dashboard/>}/>
    <Route path="add-shows" element={<AddShows/>}/>
    <Route path="list-bookings" element={<ListBookings/>}/>
    <Route path="list-shows" element={<ListShows/>}/>

    </Route>

     </Routes>

     {!isAdminRoute && !isAuthRoute && <Footer/>}
    </>
  )
}

export default App
