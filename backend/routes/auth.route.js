import express from 'express';
import {
    signup,
    signin,
    adminSignin,
    logout,
    adminLogout,
    getMe,
    getAdminMe,
    verifyEmail,
    resendOTP,
    forgotPassword,
    resetPassword,
    googleAuthStart,
    googleLogin
} from '../controllers/auth/auth.contoller.js';
import { protectCustomer, protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/admin/signin', adminSignin);
router.post('/logout', logout);
router.post('/admin/logout', adminLogout);
router.get('/me', protectCustomer, getMe);
router.get('/admin/me', protectAdmin, getAdminMe);

// OTP & Password Reset (Full implementation in Phase 2)
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/google', googleAuthStart);
router.get('/google/callback', googleLogin);

export default router;
