import Movie from '../database/models/movie.model.js';
import Show from '../database/models/show.model.js';
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

// @desc    Get all movies
// @route   GET /api/movies
// @access  Public
export const getMovies = async (req, res) => {
    const movies = await Movie.find({});
    res.json(movies);
};

// @desc    Get movies that currently have at least one show
// @route   GET /api/movies/now-showing
// @access  Public
export const getNowShowingMovies = async (req, res) => {
    await cleanupExpiredShows();

    const now = new Date();
    const shows = await Show.find({}).select('movieId startsAt date time price').lean();
    const futureShows = shows.filter((show) => getShowDateTime(show) >= now);
    const movieIdsWithShows = Array.from(new Set(futureShows.map((show) => String(show.movieId))));

    if (!movieIdsWithShows.length) {
        return res.json([]);
    }

    const movies = await Movie.find({ _id: { $in: movieIdsWithShows } }).lean();
    const pricingMap = new Map();

    futureShows.forEach((show) => {
        const key = String(show.movieId);
        const current = pricingMap.get(key);
        const nextPrice = Number(show.price || 0);
        if (!current || nextPrice < current.minPrice) {
            pricingMap.set(key, { minPrice: nextPrice });
        }
    });

    const payload = movies.map((movie) => ({
        ...movie,
        showPrice: pricingMap.get(String(movie._id))?.minPrice ?? null,
    }));

    res.json(payload);
};

// @desc    Get single movie
// @route   GET /api/movies/:id
// @access  Public
export const getMovieById = async (req, res) => {
    const movie = await Movie.findById(req.params.id);

    if (movie) {
        res.json(movie);
    } else {
        res.status(404);
        throw new Error('Movie not found');
    }
};

// @desc    Create movie (Admin only)
// @route   POST /api/movies
// @access  Private/Admin
export const createMovie = async (req, res) => {
    const normalizedTitle = String(req.body.title || '').trim();
    if (!normalizedTitle) {
        res.status(400);
        throw new Error('Movie title is required');
    }

    const existingMovie = await Movie.findOne({
        title: { $regex: `^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existingMovie) {
        existingMovie.title = normalizedTitle;
        existingMovie.description = req.body.description ?? existingMovie.description;
        existingMovie.genre = req.body.genre ?? existingMovie.genre;
        existingMovie.language = req.body.language ?? existingMovie.language;
        existingMovie.duration = req.body.duration ?? existingMovie.duration;
        existingMovie.poster = req.body.poster ?? existingMovie.poster;
        existingMovie.backdrop = req.body.backdrop ?? existingMovie.backdrop;
        existingMovie.rating = req.body.rating ?? existingMovie.rating;
        existingMovie.voteCount = req.body.voteCount ?? existingMovie.voteCount;
        existingMovie.releaseDate = req.body.releaseDate ?? existingMovie.releaseDate;
        const updatedMovie = await existingMovie.save();
        return res.status(200).json(updatedMovie);
    }

    const movie = new Movie({ ...req.body, title: normalizedTitle });
    const createdMovie = await movie.save();
    res.status(201).json(createdMovie);
};
