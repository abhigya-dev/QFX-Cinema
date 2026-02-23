import express from 'express';
import { getMovies, getNowShowingMovies, getMovieById, createMovie } from '../controllers/movie.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getMovies);
router.get('/now-showing', getNowShowingMovies);
router.get('/:id', getMovieById);
router.post('/', protectAdmin, createMovie);

export default router;
