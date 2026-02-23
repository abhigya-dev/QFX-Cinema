import Show from '../database/models/show.model.js';
import Seat from '../database/models/seat.model.js';
import Booking from '../database/models/booking.model.js';
import { getIO } from './socket.js';

const getShowDateTime = (show) => {
    if (show?.startsAt) {
        const startsAt = new Date(show.startsAt);
        if (!Number.isNaN(startsAt.getTime())) {
            return startsAt;
        }
    }

    const showDate = new Date(show.date);
    const y = showDate.getFullYear();
    const m = String(showDate.getMonth() + 1).padStart(2, '0');
    const d = String(showDate.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;
    return new Date(`${isoDate}T${show.time}`);
};

export const cleanupExpiredShows = async () => {
    const now = new Date();
    const shows = await Show.find({}).select('_id startsAt date time').lean();
    const expiredShowIds = shows
        .filter((show) => getShowDateTime(show) < now)
        .map((show) => show._id);

    if (expiredShowIds.length === 0) {
        return { deletedShows: 0 };
    }

    // Keep shows that have confirmed bookings so user history/tickets remain consistent.
    const confirmedShowIds = await Booking.distinct('showId', {
        showId: { $in: expiredShowIds },
        status: 'confirmed',
    });
    const confirmedSet = new Set(confirmedShowIds.map((id) => String(id)));
    const deletableShowIds = expiredShowIds.filter((id) => !confirmedSet.has(String(id)));

    if (deletableShowIds.length === 0) {
        return { deletedShows: 0 };
    }

    await Seat.deleteMany({ showId: { $in: deletableShowIds } });
    await Booking.deleteMany({ showId: { $in: deletableShowIds } });
    const deleteResult = await Show.deleteMany({ _id: { $in: deletableShowIds } });

    try {
        const io = getIO();
        deletableShowIds.forEach((showId) => {
            io.to(String(showId)).emit('showDeleted', { showId: String(showId) });
        });
    } catch {
        // Socket might not be initialized in non-server contexts.
    }

    return { deletedShows: deleteResult.deletedCount || 0 };
};

let intervalId = null;

export const startShowCleanupJob = () => {
    if (intervalId) return;

    intervalId = setInterval(async () => {
        try {
            await cleanupExpiredShows();
        } catch (error) {
            console.error('Show cleanup job error:', error.message);
        }
    }, 60 * 1000);
};
