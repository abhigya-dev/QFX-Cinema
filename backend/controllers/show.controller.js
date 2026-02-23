import Show from '../database/models/show.model.js';
import Booking from '../database/models/booking.model.js';
import User from '../database/models/user.model.js';
import { cleanupExpiredShows } from '../utils/showCleanup.js';

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

// @desc    Get all shows for a movie
// @route   GET /api/shows/movie/:movieId
// @access  Public
export const getShowsByMovie = async (req, res) => {
    await cleanupExpiredShows();
    const shows = await Show.find({ movieId: req.params.movieId }).sort({ startsAt: 1, date: 1, time: 1 });
    res.json(shows);
};

// @desc    Create show (Admin only)
// @route   POST /api/shows
// @access  Private/Admin
export const createShow = async (req, res) => {
    const { movieId, theatreId, date, time, startsAt } = req.body;
    const showDateTime = startsAt ? new Date(startsAt) : getShowDateTime({ date, time });
    if (Number.isNaN(showDateTime.getTime())) {
        res.status(400);
        throw new Error('Invalid show date/time');
    }
    if (showDateTime <= new Date()) {
        res.status(400);
        throw new Error('Cannot create show in past date/time');
    }

    const existingShow = await Show.findOne({ movieId, theatreId, date, time });
    if (existingShow) {
        res.status(400);
        throw new Error('Show already exists for this movie, theatre, date and time');
    }

    const show = new Show({ ...req.body, startsAt: showDateTime.toISOString() });
    const createdShow = await show.save();
    res.status(201).json(createdShow);
};

// @desc    Update ticket price for all future shows of a movie (Admin)
// @route   PUT /api/shows/admin/movie/:movieId/price
// @access  Private/Admin
export const updateMovieShowPrice = async (req, res) => {
    const { movieId } = req.params;
    const { price } = req.body;

    const nextPrice = Number(price);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
        res.status(400);
        throw new Error('Valid price is required');
    }

    const shows = await Show.find({ movieId }).lean();
    const now = new Date();
    const futureShowIds = shows
        .filter((show) => getShowDateTime(show) >= now)
        .map((show) => show._id);

    if (!futureShowIds.length) {
        return res.json({ updatedCount: 0, message: 'No future shows found for this movie' });
    }

    const result = await Show.updateMany(
        { _id: { $in: futureShowIds } },
        { price: nextPrice }
    );

    res.json({
        updatedCount: result.modifiedCount || 0,
        message: 'Future show prices updated successfully',
    });
};

// @desc    Get all shows (Admin)
// @route   GET /api/shows/admin/list
// @access  Private/Admin
export const getAdminShows = async (req, res) => {
    await cleanupExpiredShows();

    const shows = await Show.find({})
        .populate('movieId')
        .sort({ startsAt: -1, date: -1, time: -1 })
        .lean();
    const now = new Date();
    const activeShows = shows.filter((show) => getShowDateTime(show) >= now);
    const showIds = activeShows.map((show) => show._id);
    const bookingStats = await Booking.aggregate([
        { $match: { showId: { $in: showIds }, status: 'confirmed' } },
        {
            $group: {
                _id: '$showId',
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                seatsBooked: { $sum: { $size: '$seatIds' } },
            },
        },
    ]);

    const statsMap = new Map(
        bookingStats.map((stats) => [stats._id.toString(), stats])
    );

    const movieMap = new Map();
    for (const show of activeShows) {
        const showDateTime = getShowDateTime(show);
        const stats = statsMap.get(show._id.toString());
        const movieKey = String(show.movieId?._id || show.movieId);

        if (!movieMap.has(movieKey)) {
            movieMap.set(movieKey, {
                _id: movieKey,
                movie: show.movieId,
                totalBookings: 0,
                totalRevenue: 0,
                seatsBooked: 0,
                totalSeats: 0,
                activeShowCount: 0,
                showPrice: show.price,
                nextShowDateTime: showDateTime,
                upcomingSlots: [],
            });
        }

        const row = movieMap.get(movieKey);
        row.totalBookings += stats?.totalBookings || 0;
        row.totalRevenue += stats?.totalRevenue || 0;
        row.seatsBooked += stats?.seatsBooked || 0;
        row.totalSeats += show.totalSeats || 0;
        row.activeShowCount += 1;
        row.showPrice = Math.min(Number(row.showPrice || show.price), Number(show.price || row.showPrice || 0));

        if (showDateTime < row.nextShowDateTime) {
            row.nextShowDateTime = showDateTime;
        }

        row.upcomingSlots.push({
            showId: show._id,
            showDateTime,
            showPrice: show.price,
            totalBookings: stats?.totalBookings || 0,
            totalRevenue: stats?.totalRevenue || 0,
        });
    }

    const payload = Array.from(movieMap.values())
        .map((row) => ({
            ...row,
            upcomingSlots: row.upcomingSlots.sort((a, b) => new Date(a.showDateTime) - new Date(b.showDateTime)),
        }))
        .sort((a, b) => new Date(a.nextShowDateTime) - new Date(b.nextShowDateTime));

    res.json(payload);
};

// @desc    Admin dashboard summary
// @route   GET /api/shows/admin/dashboard
// @access  Private/Admin
export const getAdminDashboard = async (req, res) => {
    await cleanupExpiredShows();

    const [confirmedBookings, totalUsers, shows] = await Promise.all([
        Booking.find({ status: 'confirmed' }).lean(),
        User.countDocuments(),
        Show.find({}).lean(),
    ]);

    const now = new Date();
    const activeMovies = new Set(
        shows
            .filter((show) => getShowDateTime(show) >= now)
            .map((show) => String(show.movieId))
    ).size;
    const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const totalBookings = confirmedBookings.length;

    res.json({
        totalBookings,
        totalRevenue,
        totalUser: totalUsers,
        activeShows: activeMovies,
    });
};
