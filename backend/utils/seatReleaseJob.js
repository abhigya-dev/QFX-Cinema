import Seat from '../database/models/seat.model.js';
import { getIO } from './socket.js';

let intervalId;

export const startSeatReleaseJob = () => {
    if (intervalId) return;

    intervalId = setInterval(async () => {
        try {
            const now = new Date();
            const expiredSeats = await Seat.find({
                status: 'reserved',
                reservedUntil: { $lte: now }
            });

            if (expiredSeats.length === 0) return;

            await Seat.updateMany(
                { _id: { $in: expiredSeats.map((seat) => seat._id) } },
                { status: 'available', reservedBy: null, reservedUntil: null }
            );

            const io = getIO();
            const grouped = new Map();
            for (const seat of expiredSeats) {
                const showId = String(seat.showId);
                if (!grouped.has(showId)) grouped.set(showId, []);
                grouped.get(showId).push({
                    ...seat.toObject(),
                    status: 'available',
                    reservedBy: null,
                    reservedUntil: null,
                });
            }

            grouped.forEach((seats, showId) => {
                io.to(showId).emit('seatStatusUpdated', {
                    showId,
                    seats: seats.map((seat) => ({
                        _id: String(seat._id),
                        showId: String(seat.showId),
                        status: seat.status,
                        reservedBy: null,
                        reservedUntil: null,
                        seatNumber: seat.seatNumber,
                        row: seat.row,
                    })),
                });
            });
        } catch (error) {
            console.error('Seat release job error:', error.message);
        }
    }, 10 * 1000);
};
