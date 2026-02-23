import express from 'express';
import { getAdminBookings, getMyBookings, downloadMyBookingTicket, deleteMyPastBooking } from '../controllers/booking.controller.js';
import { protectAdmin, protectCustomer } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my', protectCustomer, getMyBookings);
router.get('/my/:bookingId/ticket', protectCustomer, downloadMyBookingTicket);
router.delete('/my/:bookingId', protectCustomer, deleteMyPastBooking);
router.get('/admin/list', protectAdmin, getAdminBookings);

export default router;
