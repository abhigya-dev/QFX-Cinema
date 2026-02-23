import express from 'express';
import { getShowsByMovie, createShow, getAdminShows, getAdminDashboard, updateMovieShowPrice } from '../controllers/show.controller.js';
import { protectAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/admin/list', protectAdmin, getAdminShows);
router.get('/admin/dashboard', protectAdmin, getAdminDashboard);
router.put('/admin/movie/:movieId/price', protectAdmin, updateMovieShowPrice);
router.get('/movie/:movieId', getShowsByMovie);
router.post('/', protectAdmin, createShow);

export default router;
