import express from 'express';
import { createCheckoutSession, stripeWebhook, verifyCheckoutSession, retryCheckoutSession } from '../controllers/payment.controller.js';
import { protectCustomer } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/create-checkout-session', protectCustomer, createCheckoutSession);
router.post('/retry/:bookingId', protectCustomer, retryCheckoutSession);
router.get('/verify-session', protectCustomer, verifyCheckoutSession);
router.post('/webhook', stripeWebhook);

export default router;
