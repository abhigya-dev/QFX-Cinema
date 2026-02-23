import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectMongoDB from './database/connection.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { sendSignupOTP, sendPasswordResetEmail, handleBookingConfirmed, sendBookingReminder, autoReleaseSeats } from "./inngest/functions.js";
import http from 'http';
import { initIO } from './utils/socket.js';
import paymentRoutes from './routes/payment.route.js';
import authRoutes from './routes/auth.route.js';
import movieRoutes from './routes/movie.route.js';
import showRoutes from './routes/show.route.js';
import seatRoutes from './routes/seat.route.js';
import bookingRoutes from './routes/booking.route.js';
import { startSeatReleaseJob } from './utils/seatReleaseJob.js';
import { syncAdminUsers } from './utils/syncAdminUsers.js';
import { startShowCleanupJob } from './utils/showCleanup.js';
import { isEmailConfigured } from './utils/email.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

if (!isEmailConfigured()) {
    console.warn('Email service is not fully configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.');
}
if (!process.env.INNGEST_EVENT_KEY || !process.env.INNGEST_SIGNING_KEY) {
    console.warn('Inngest keys are missing. Inngest functions may not run in production.');
}

// Connect to MongoDB
await connectMongoDB();
await syncAdminUsers();

// Initialize Socket.io
initIO(server);
startSeatReleaseJob();
startShowCleanupJob();

// Inngest serve endpoint
app.use("/api/inngest", serve({
    client: inngest,
    functions: [
        sendSignupOTP,
        sendPasswordResetEmail,
        handleBookingConfirmed,
        sendBookingReminder,
        autoReleaseSeats
    ]
}));

// Webhook route needs raw body parser (must be before express.json)
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

const normalizedAllowedOrigin = String(process.env.CLIENT_URL || '').replace(/\/$/, '');

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // allow non-browser tools and server-to-server calls
        if (!origin) return callback(null, true);
        const normalizedOrigin = String(origin).replace(/\/$/, '');
        if (normalizedOrigin === normalizedAllowedOrigin) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`Server is up and backend file is running on the port ${PORT}`)
})
