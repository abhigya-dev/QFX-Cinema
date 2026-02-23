import Seat from '../database/models/seat.model.js';
import { inngest } from '../inngest/client.js';
import { getIO } from '../utils/socket.js';

const emitSeatStatusUpdated = (showId, seats) => {
    if (!seats?.length) return;
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

const safeInngestSend = async (payload) => {
    try {
        await inngest.send(payload);
    } catch (error) {
        console.warn('Inngest event send failed:', error.message);
    }
};

const releaseExpiredSeatsForShow = async (showId) => {
    const expiredSeats = await Seat.find({
        showId,
        status: 'reserved',
        reservedUntil: { $lte: new Date() },
    });

    if (expiredSeats.length === 0) return;

    await Seat.updateMany(
        { _id: { $in: expiredSeats.map((seat) => seat._id) } },
        { status: 'available', reservedBy: null, reservedUntil: null }
    );

    const releasedSeats = expiredSeats.map((seat) => ({
        ...seat.toObject(),
        status: 'available',
        reservedBy: null,
        reservedUntil: null,
    }));
    emitSeatStatusUpdated(showId, releasedSeats);
};

// @desc    Get all seats for a show
// @route   GET /api/seats/show/:showId
// @access  Public
export const getSeatsByShow = async (req, res) => {
    await releaseExpiredSeatsForShow(req.params.showId);

    const seats = await Seat.find({ showId: req.params.showId });
    res.json(seats);
};

// @desc    Reserve a seat
// @route   POST /api/seats/reserve
// @access  Private
export const reserveSeat = async (req, res) => {
    const { seatIds = [] } = req.body; // Array of seat IDs
    const showId = req.body.showId;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
        res.status(400);
        throw new Error('showId and seatIds are required');
    }

    // Always free expired reservations for this show first.
    await releaseExpiredSeatsForShow(showId);

    const seats = await Seat.find({ _id: { $in: seatIds }, showId });
    if (seats.length !== seatIds.length) {
        res.status(404);
        throw new Error('Some seats not found for this show');
    }

    const now = new Date();
    const conflictedSeat = seats.find(
        (seat) =>
            seat.status === 'booked' ||
            (seat.status === 'reserved' &&
                seat.reservedUntil > now &&
                String(seat.reservedBy) !== String(userId))
    );

    if (conflictedSeat) {
        res.status(400);
        throw new Error('Some seats are already reserved or booked');
    }

    const reservedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    await Seat.updateMany(
        { _id: { $in: seatIds }, showId },
        { status: 'reserved', reservedBy: userId, reservedUntil }
    );

    const updatedSeats = await Seat.find({ _id: { $in: seatIds }, showId });
    emitSeatStatusUpdated(showId, updatedSeats);

    // Trigger Inngest to auto-release if not booked
    safeInngestSend({
        name: "seat/reserved",
        data: {
            seatIds,
            showId,
            userId
        }
    });

    res.status(200).json({ message: 'Seats reserved for 5 minutes', reservedUntil });
};

// @desc    Release reserved seats by current user
// @route   POST /api/seats/release
// @access  Private
export const releaseSeat = async (req, res) => {
    const { seatIds = [] } = req.body;
    const showId = req.body.showId;
    const userId = req.user._id;

    if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
        res.status(400);
        throw new Error('showId and seatIds are required');
    }

    const releasableSeats = await Seat.find({
        _id: { $in: seatIds },
        showId,
        status: 'reserved',
        reservedBy: userId,
    });

    if (releasableSeats.length > 0) {
        await Seat.updateMany(
            { _id: { $in: releasableSeats.map((seat) => seat._id) } },
            { status: 'available', reservedBy: null, reservedUntil: null }
        );

        const releasedSeats = releasableSeats.map((seat) => ({
            ...seat.toObject(),
            status: 'available',
            reservedBy: null,
            reservedUntil: null,
        }));
        emitSeatStatusUpdated(showId, releasedSeats);
    }

    res.status(200).json({ message: 'Seats released' });
};

// @desc    Initialize seats for a show (Admin only)
// @route   POST /api/seats/init
// @access  Private/Admin
export const initSeats = async (req, res) => {
    const { showId, rows, cols } = req.body;
    const seats = [];

    for (let i = 0; i < rows.length; i++) {
        for (let j = 1; j <= cols; j++) {
            seats.push({
                showId,
                seatNumber: `${rows[i]}${j}`,
                row: rows[i],
                type: rows[i] === 'A' ? 'premium' : 'normal', // Example logic
            });
        }
    }

    await Seat.insertMany(seats);
    res.status(201).json({ message: `${seats.length} seats initialized` });
};
