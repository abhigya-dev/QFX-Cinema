import jwt from 'jsonwebtoken';

const generateToken = (res, userId, options = {}) => {
    const { cookieName = 'jwt' } = options;
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
    const isLocalhost =
        process.env.CLIENT_URL?.includes('localhost') ||
        process.env.CLIENT_URL?.includes('127.0.0.1');

    const secureCookie = !isLocalhost;
    const sameSite = isLocalhost ? 'lax' : 'none';

    // Set JWT as HTTP-only cookie
    res.cookie(cookieName, token, {
        httpOnly: true,
        secure: secureCookie,
        sameSite,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return token;
};

export default generateToken;
