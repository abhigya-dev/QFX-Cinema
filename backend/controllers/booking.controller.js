import Booking from '../database/models/booking.model.js';
import Seat from '../database/models/seat.model.js';
import User from '../database/models/user.model.js';
import { generateTicketPDF } from '../utils/pdf.js';
import path from 'path';
import fs from 'fs';

const toUtcDateKey = (value) => {
    const date = new Date(value);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// @desc    Logged-in user bookings
// @route   GET /api/bookings/my
// @access  Private
export const getMyBookings = async (req, res) => {
    // Cancel expired pending bookings and free their seats before listing.
    const now = new Date();
    const pendingBookings = await Booking.find({ userId: req.user._id, status: 'pending' })
        .populate('seatIds')
        .lean();

    for (const pending of pendingBookings) {
        const latestReservedUntil = (pending.seatIds || [])
            .map((seat) => seat?.reservedUntil)
            .filter(Boolean)
            .sort()
            .at(-1);

        if (!latestReservedUntil || new Date(latestReservedUntil) <= now) {
            await Booking.updateOne({ _id: pending._id }, { status: 'cancelled' });
            await Seat.updateMany(
                {
                    _id: { $in: pending.seatIds.map((seat) => seat._id) },
                    status: 'reserved',
                    reservedBy: req.user._id,
                },
                {
                    status: 'available',
                    reservedBy: null,
                    reservedUntil: null,
                }
            );
        }
    }

    const bookings = await Booking.find({ userId: req.user._id, status: { $in: ['pending', 'confirmed'] } })
        .populate('movieId')
        .populate('showId')
        .populate('seatIds')
        .sort({ createdAt: -1 })
        .lean();

    const payload = bookings.map((booking) => ({
        status: booking.status,
        _id: booking._id,
        amount: booking.totalAmount,
        bookedSeats: (booking.seatIds || []).map((seat) => seat.seatNumber),
        createdAt: booking.createdAt,
        expiresAt:
            booking.status === 'pending'
                ? (booking.seatIds || [])
                    .map((seat) => seat.reservedUntil)
                    .filter(Boolean)
                    .sort()
                    .at(-1) || null
                : null,
        show: {
            _id: booking.showId?._id,
            showDateTime: booking.showId
                ? new Date(`${toUtcDateKey(booking.showId.date)}T${booking.showId.time}`)
                : null,
            movie: booking.movieId,
        },
    }));

    res.json(payload);
};

// @desc    All bookings (Admin)
// @route   GET /api/bookings/admin/list
// @access  Private/Admin
export const getAdminBookings = async (req, res) => {
    const bookings = await Booking.find({ status: 'confirmed' })
        .populate('userId', 'name email')
        .populate('movieId')
        .populate('showId')
        .populate('seatIds')
        .sort({ createdAt: -1 })
        .lean();

    const payload = bookings.map((booking) => ({
        _id: booking._id,
        amount: booking.totalAmount,
        bookedSeats: (booking.seatIds || []).map((seat) => seat.seatNumber),
        user: booking.userId,
        show: {
            _id: booking.showId?._id,
            showDateTime: booking.showId
                ? new Date(`${toUtcDateKey(booking.showId.date)}T${booking.showId.time}`)
                : null,
            movie: booking.movieId,
        },
    }));

    res.json(payload);
};

// @desc    Download ticket PDF for logged-in user's confirmed booking
// @route   GET /api/bookings/my/:bookingId/ticket
// @access  Private
export const downloadMyBookingTicket = async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId)
        .populate('movieId')
        .populate('showId')
        .populate('seatIds');

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found');
    }

    if (String(booking.userId) !== String(req.user._id)) {
        res.status(403);
        throw new Error('Not authorized to download this ticket');
    }

    if (booking.status !== 'confirmed') {
        res.status(400);
        throw new Error('Ticket PDF is available only for confirmed bookings');
    }

    const user = await User.findById(req.user._id);
    if (!user || !booking.movieId || !booking.showId) {
        res.status(400);
        throw new Error('Booking data is incomplete');
    }

    const tempDir = path.join(process.cwd(), 'temp');
    const pdfPath = path.join(tempDir, `ticket-${booking._id}.pdf`);

    await generateTicketPDF(booking, booking.movieId, booking.showId, user, pdfPath);

    res.download(pdfPath, `ticket-${booking._id}.pdf`, () => {
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }
    });
};
