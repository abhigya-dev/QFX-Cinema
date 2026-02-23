import express from 'express';
import { getSeatsByShow, reserveSeat, releaseSeat, initSeats } from '../controllers/seat.controller.js';
import { protectAdmin, protectCustomer } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/show/:showId', getSeatsByShow);
router.post('/reserve', protectCustomer, reserveSeat);
router.post('/release', protectCustomer, releaseSeat);
router.post('/init', protectAdmin, initSeats);

export default router;
