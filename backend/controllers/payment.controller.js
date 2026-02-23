import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import Booking from '../database/models/booking.model.js';
import Show from '../database/models/show.model.js';
import Seat from '../database/models/seat.model.js';
import User from '../database/models/user.model.js';
import { inngest } from '../inngest/client.js';
import { generateTicketPDF } from '../utils/pdf.js';
import { sendEmail } from '../utils/email.js';
import { getIO } from '../utils/socket.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

const emitSeatStatusUpdated = async (showId, seatIds) => {
    if (!showId || !seatIds?.length) return;
    const seats = await Seat.find({ _id: { $in: seatIds } });
    if (!seats.length) return;
    const io = getIO();
    io.to(String(showId)).emit('seatStatusUpdated', {
        showId: String(showId),
        seats: seats.map((seat) => ({
            _id: String(seat._id),
            showId: String(seat.showId),
            status: seat.status,
            reservedBy: seat.reservedBy ? String(seat.reservedBy) : null,
            reservedUntil: seat.reservedUntil || null,
            seatNumber: seat.seatNumber,
            row: seat.row,
        })),
    });
};

const sendBookingTicketEmail = async (bookingId) => {
    const booking = await Booking.findById(bookingId)
        .populate('seatIds')
        .populate('movieId')
        .populate('showId');

    if (!booking || booking.ticketEmailSent || booking.status !== 'confirmed') return;

    const user = await User.findById(booking.userId);
    if (!user || !booking.movieId || !booking.showId) return;

    const pdfPath = path.join(process.cwd(), 'temp', `ticket-${booking._id}.pdf`);
    await generateTicketPDF(booking, booking.movieId, booking.showId, user, pdfPath);

    try {
        await sendEmail({
            to: user.email,
            subject: `Booking Confirmed - ${booking.movieId.title}`,
            html: `<h1>Booking Confirmed</h1><p>Your ticket for <b>${booking.movieId.title}</b> is attached.</p>`,
            attachments: [
                {
                    filename: `ticket-${booking._id}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf'
                }
            ]
        });

        booking.ticketEmailSent = true;
        await booking.save();
    } finally {
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }
};

// @desc    Create Stripe checkout session
// @route   POST /api/payment/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req, res) => {
    const { showId, seatIds } = req.body;

    const show = await Show.findById(showId).populate('movieId');
    if (!show) {
        res.status(404);
        throw new Error('Show not found');
    }

    const seats = await Seat.find({ _id: { $in: seatIds } });
    if (seats.length !== seatIds.length) {
        res.status(400);
        throw new Error('Some seats not found');
    }

    const now = new Date();
    const invalidSeat = seats.find(
        (seat) =>
            seat.status !== 'reserved' ||
            seat.reservedBy?.toString() !== req.user._id.toString() ||
            !seat.reservedUntil ||
            seat.reservedUntil <= now
    );
    if (invalidSeat) {
        res.status(400);
        throw new Error('Seat reservation expired. Please select seats again.');
    }

    const totalAmount = show.price * seats.length;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: STRIPE_CURRENCY,
                    product_data: {
                        name: `${show.movieId.title} - ${show.time}`,
                        description: `Seats: ${seats.map(s => s.seatNumber).join(', ')}`,
                    },
                    unit_amount: Math.round(show.price * 100),
                },
                quantity: seats.length,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/booking/cancel`,
        customer_email: req.user.email,
        metadata: {
            userId: req.user._id.toString(),
            showId: showId.toString(),
            seatIds: JSON.stringify(seatIds),
            movieId: show.movieId._id.toString(),
        },
    });

    // Create a pending booking
    await Booking.create({
        userId: req.user._id,
        showId,
        movieId: show.movieId._id,
        seatIds,
        totalAmount,
        stripeSessionId: session.id,
        status: 'pending',
    });

    res.json({ id: session.id, url: session.url });
};

// @desc    Retry Stripe checkout for an existing pending booking
// @route   POST /api/payment/retry/:bookingId
// @access  Private
export const retryCheckoutSession = async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId)
        .populate('showId')
        .populate('movieId')
        .populate('seatIds');

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this booking');
    }

    if (booking.status !== 'pending') {
        res.status(400);
        throw new Error('Only pending bookings can be retried');
    }

    const seatIds = (booking.seatIds || []).map((seat) => seat._id.toString());
    const liveSeats = await Seat.find({ _id: { $in: seatIds } });

    if (liveSeats.length !== seatIds.length) {
        res.status(400);
        throw new Error('Some seats are no longer available');
    }

    const now = new Date();
    const invalidSeat = liveSeats.find(
        (seat) =>
            seat.status !== 'reserved' ||
            seat.reservedBy?.toString() !== req.user._id.toString() ||
            !seat.reservedUntil ||
            seat.reservedUntil <= now
    );

    if (invalidSeat) {
        res.status(400);
        throw new Error('Seat reservation expired. Please select seats again.');
    }

    const show = booking.showId;
    const movie = booking.movieId;
    const unitAmount = Number(show.price);

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: STRIPE_CURRENCY,
                    product_data: {
                        name: `${movie.title} - ${show.time}`,
                        description: `Seats: ${liveSeats.map(s => s.seatNumber).join(', ')}`,
                    },
                    unit_amount: Math.round(unitAmount * 100),
                },
                quantity: liveSeats.length,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/booking/cancel`,
        customer_email: req.user.email,
        metadata: {
            userId: req.user._id.toString(),
            showId: show._id.toString(),
            seatIds: JSON.stringify(seatIds),
            movieId: movie._id.toString(),
            bookingId: booking._id.toString(),
        },
    });

    booking.stripeSessionId = session.id;
    await booking.save();

    res.json({ id: session.id, url: session.url });
};

// @desc    Verify Stripe checkout session and confirm booking
// @route   GET /api/payment/verify-session
// @access  Private
export const verifyCheckoutSession = async (req, res) => {
    const sessionId = req.query.session_id;
    if (!sessionId) {
        res.status(400);
        throw new Error('Missing session_id');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId.toString());
    const booking = await Booking.findOne({ stripeSessionId: sessionId });

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found for this session');
    }

    if (booking.userId.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('Not authorized to access this booking');
    }

    if (session.payment_status === 'paid' && booking.status !== 'confirmed') {
        booking.status = 'confirmed';
        await booking.save();

        await Seat.updateMany(
            { _id: { $in: booking.seatIds } },
            { status: 'booked', reservedBy: null, reservedUntil: null }
        );
        await emitSeatStatusUpdated(booking.showId, booking.seatIds);

        await sendBookingTicketEmail(booking._id);
    }

    res.json({
        status: booking.status,
        paymentStatus: session.payment_status,
        bookingId: booking._id,
    });
};

// @desc    Stripe Webhook handler
// @route   POST /api/payment/webhook
// @access  Public
export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const { userId, showId, seatIds, movieId, bookingId } = session.metadata;
        const parsedSeatIds = JSON.parse(seatIds);

        // Update Booking status
        const booking = await Booking.findOneAndUpdate(
            bookingId ? { _id: bookingId } : { stripeSessionId: session.id },
            { status: 'confirmed' },
            { new: true }
        );

        // Mark seats as booked
        await Seat.updateMany(
            { _id: { $in: parsedSeatIds } },
            { status: 'booked', reservedBy: null, reservedUntil: null }
        );
        await emitSeatStatusUpdated(showId, parsedSeatIds);

        if (booking) {
            await sendBookingTicketEmail(booking._id);
        }

        // Trigger Inngest booking/confirmed event
        await inngest.send({
            name: "booking/confirmed",
            data: {
                bookingId: booking._id,
                userId,
                showId,
                movieId,
                seatIds: parsedSeatIds,
                totalAmount: session.amount_total / 100,
            }
        });
    }

    res.json({ received: true });
};
