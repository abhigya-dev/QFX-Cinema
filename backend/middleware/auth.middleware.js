import jwt from 'jsonwebtoken';
import User from '../database/models/user.model.js';

const CUSTOMER_COOKIE = 'jwt';
const ADMIN_COOKIE = 'admin_jwt';

const resolveToken = (req, preferredCookie) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (preferredCookie && req.cookies?.[preferredCookie]) {
        token = req.cookies[preferredCookie];
    } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
    } else if (req.cookies?.admin_jwt) {
        token = req.cookies.admin_jwt;
    }
    return token;
};

const attachUserFromToken = async (req, res, token) => {
    if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password');
        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized, user not found');
        }
    } else {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
};

const protect = async (req, res, next) => {
    try {
        const token = resolveToken(req, null);
        await attachUserFromToken(req, res, token);
        next();
    } catch (error) {
        if (!String(error?.message || '').toLowerCase().includes('no token')) {
            console.error(error);
        }
        res.status(401);
        throw new Error('Not authorized, token failed');
    }
};

const protectCustomer = async (req, res, next) => {
    try {
        const token = resolveToken(req, CUSTOMER_COOKIE);
        await attachUserFromToken(req, res, token);
        if (req.user?.isAdmin) {
            res.status(403);
            throw new Error('Admin accounts are not allowed on client booking routes');
        }
        next();
    } catch (error) {
        if (!String(error?.message || '').toLowerCase().includes('no token')) {
            console.error(error);
        }
        if (!res.statusCode || res.statusCode < 400) {
            res.status(401);
        }
        throw new Error(error.message || 'Not authorized, token failed');
    }
};

const protectAdmin = async (req, res, next) => {
    try {
        const token = resolveToken(req, ADMIN_COOKIE);
        await attachUserFromToken(req, res, token);
        if (!req.user?.isAdmin) {
            res.status(401);
            throw new Error('Not authorized as an admin');
        }
        next();
    } catch (error) {
        if (!String(error?.message || '').toLowerCase().includes('no token')) {
            console.error(error);
        }
        if (!res.statusCode || res.statusCode < 400) {
            res.status(401);
        }
        throw new Error(error.message || 'Not authorized, token failed');
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

const customer = (req, res, next) => {
    if (req.user && !req.user.isAdmin) {
        next();
    } else {
        res.status(403);
        throw new Error('Admin accounts are not allowed on client booking routes');
    }
};

export { protect, protectCustomer, protectAdmin, admin, customer, CUSTOMER_COOKIE, ADMIN_COOKIE };
