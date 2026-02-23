import User from '../../database/models/user.model.js';
import PendingSignup from '../../database/models/pendingSignup.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import generateToken from '../../utils/generateToken.js';
import { inngest } from '../../inngest/client.js';
import { sendEmail, getOTPTemplate, getResetPasswordTemplate, isEmailConfigured } from '../../utils/email.js';
import { uploadProfileImageToCloudinary } from '../../utils/cloudinary.js';

const CUSTOMER_COOKIE = 'jwt';
const ADMIN_COOKIE = 'admin_jwt';

const safeInngestSend = async (payload) => {
    try {
        await inngest.send(payload);
        return true;
    } catch (error) {
        console.warn('Inngest event send failed:', error.message);
        return false;
    }
};

const sendSignupOtpEmail = async ({ id, name, email, otp }) => {
    try {
        await sendEmail({
            to: email,
            subject: 'Verify your email - QFX Cinemas',
            html: getOTPTemplate(name, otp),
        });
        return true;
    } catch (directEmailError) {
        // Fallback to Inngest pipeline if direct SMTP call fails
        return await safeInngestSend({
            name: 'auth/signup',
            data: {
                user: { id, name, email, otp },
            },
        });
    }
};

const sendResetPasswordEmail = async ({ id, name, email, resetUrl }) => {
    try {
        await sendEmail({
            to: email,
            subject: 'Reset your password - QFX Cinemas',
            html: getResetPasswordTemplate(name, resetUrl),
        });
        return true;
    } catch (directEmailError) {
        return await safeInngestSend({
            name: 'auth/forgot-password',
            data: {
                user: { id, name, email },
                resetUrl,
            },
        });
    }
};

const getAdminEmails = () =>
    new Set(
        (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );

const shouldGrantAdmin = (email) => getAdminEmails().has(String(email || '').toLowerCase());
const getAdminDefaultPassword = () => process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const getServerBaseUrl = (req) => {
    if (process.env.SERVER_URL) return process.env.SERVER_URL;
    return `${req.protocol}://${req.get('host')}`;
};

const getGoogleCallbackUrl = (req) =>
    process.env.GOOGLE_REDIRECT_URI || `${getServerBaseUrl(req)}/api/auth/google/callback`;

// @desc    Register user (pending) and send OTP
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
    const { name, password } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!name || !password || !email) {
        res.status(400);
        throw new Error('Name, email and password are required');
    }
    if (!isEmailConfigured()) {
        res.status(500);
        throw new Error('Email service is not configured on server');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOtpCode();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    const pending = await PendingSignup.findOneAndUpdate(
        { email },
        {
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpire,
            isAdmin: shouldGrantAdmin(email),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const queued = await sendSignupOtpEmail({
        id: pending._id,
        name: pending.name,
        email: pending.email,
        otp,
    });

    if (!queued) {
        res.status(503);
        throw new Error('Could not send OTP email right now. Please try again shortly.');
    }

    res.status(200).json({
        email: pending.email,
        message: 'OTP sent to email. Verify OTP to complete account creation.',
    });
};

// @desc    Verify Email OTP and create account
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res) => {
    const otp = String(req.body.otp || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email || !otp) {
        res.status(400);
        throw new Error('Email and OTP are required');
    }

    const pending = await PendingSignup.findOne({ email }).select('+password');
    if (!pending) {
        res.status(404);
        throw new Error('No pending signup found for this email. Please sign up again.');
    }

    if (pending.otp !== otp || pending.otpExpire < Date.now()) {
        res.status(400);
        throw new Error('Invalid or expired OTP');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        await PendingSignup.deleteOne({ _id: pending._id });
        res.status(400);
        throw new Error('User already exists. Please sign in.');
    }

    const user = await User.create({
        name: pending.name,
        email: pending.email,
        password: pending.password,
        isVerified: true,
        isAdmin: pending.isAdmin,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    generateToken(res, user._id, { cookieName: CUSTOMER_COOKIE });
    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        imageUrl: user.imageUrl || '',
        message: 'Email verified and account created successfully',
    });
};

// @desc    Resend OTP for pending signup
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }
    if (!isEmailConfigured()) {
        res.status(500);
        throw new Error('Email service is not configured on server');
    }

    const pending = await PendingSignup.findOne({ email });
    if (!pending) {
        res.status(404);
        throw new Error('No pending signup found for this email');
    }

    const otp = generateOtpCode();
    pending.otp = otp;
    pending.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    const queued = await sendSignupOtpEmail({
        id: pending._id,
        name: pending.name,
        email: pending.email,
        otp,
    });

    if (!queued) {
        res.status(503);
        throw new Error('Could not resend OTP email right now. Please try again shortly.');
    }

    res.status(200).json({ message: 'New OTP sent to email' });
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/signin
// @access  Public
export const signin = async (req, res) => {
    const password = String(req.body.password || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    let user = await User.findOne({ email }).select('+password');
    const isWhitelistedAdmin = shouldGrantAdmin(email);
    const defaultAdminPassword = getAdminDefaultPassword();
    const isUsingDefaultAdminPassword = password === defaultAdminPassword;

    if (!user && isWhitelistedAdmin && isUsingDefaultAdminPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
            name: 'QFX Admin',
            email,
            password: hashedPassword,
            isVerified: true,
            isAdmin: true,
        });
        user = await User.findById(user._id).select('+password');
    }

    if (user && isWhitelistedAdmin && isUsingDefaultAdminPassword) {
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        if (!user.isAdmin) {
            user.isAdmin = true;
        }
        if (!user.isVerified) {
            user.isVerified = true;
        }
        await user.save();
        user = await User.findById(user._id).select('+password');
    }

    if (user && !user.isAdmin && !user.isVerified) {
        res.status(403);
        throw new Error('Email is not verified. Please complete OTP verification first.');
    }

    if (user && (await bcrypt.compare(password, user.password))) {
        if (user.isAdmin) {
            res.status(403);
            throw new Error('Admin account must use admin login route');
        }
        generateToken(res, user._id, { cookieName: CUSTOMER_COOKIE });
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            isAdmin: user.isAdmin,
            imageUrl: user.imageUrl || '',
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
};

// @desc    Authenticate admin & get admin token
// @route   POST /api/auth/admin/signin
// @access  Public
export const adminSignin = async (req, res) => {
    const password = String(req.body.password || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    let user = await User.findOne({ email }).select('+password');
    const isWhitelistedAdmin = shouldGrantAdmin(email);
    const defaultAdminPassword = getAdminDefaultPassword();
    const isUsingDefaultAdminPassword = password === defaultAdminPassword;

    if (!user && isWhitelistedAdmin && isUsingDefaultAdminPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
            name: 'QFX Admin',
            email,
            password: hashedPassword,
            isVerified: true,
            isAdmin: true,
        });
        user = await User.findById(user._id).select('+password');
    }

    if (user && isWhitelistedAdmin && isUsingDefaultAdminPassword) {
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        if (!user.isAdmin) {
            user.isAdmin = true;
        }
        if (!user.isVerified) {
            user.isVerified = true;
        }
        await user.save();
        user = await User.findById(user._id).select('+password');
    }

    if (user && (await bcrypt.compare(password, user.password)) && user.isAdmin) {
        generateToken(res, user._id, { cookieName: ADMIN_COOKIE });
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            isAdmin: user.isAdmin,
            imageUrl: user.imageUrl || '',
        });
    } else {
        res.status(401);
        throw new Error('Invalid admin email or password');
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logout = (req, res) => {
    const isLocalhost =
        process.env.CLIENT_URL?.includes('localhost') ||
        process.env.CLIENT_URL?.includes('127.0.0.1');
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(0),
        secure: !isLocalhost,
        sameSite: isLocalhost ? 'lax' : 'none',
    };

    res.cookie(CUSTOMER_COOKIE, '', {
        ...cookieOptions,
    });
    res.cookie('jwt', '', {
        ...cookieOptions,
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Logout admin / clear admin cookie
// @route   POST /api/auth/admin/logout
// @access  Public
export const adminLogout = (req, res) => {
    const isLocalhost =
        process.env.CLIENT_URL?.includes('localhost') ||
        process.env.CLIENT_URL?.includes('127.0.0.1');
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(0),
        secure: !isLocalhost,
        sameSite: isLocalhost ? 'lax' : 'none',
    };

    res.cookie(ADMIN_COOKIE, '', {
        ...cookieOptions,
    });
    res.status(200).json({ message: 'Admin logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            isAdmin: user.isAdmin,
            imageUrl: user.imageUrl || '',
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

// @desc    Get admin profile
// @route   GET /api/auth/admin/me
// @access  Private (admin cookie)
export const getAdminMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user || !user.isAdmin) {
        res.status(404);
        throw new Error('Admin user not found');
    }

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        imageUrl: user.imageUrl || '',
    });
};

// @desc    Update customer profile
// @route   PUT /api/auth/me
// @access  Private (customer cookie)
export const updateMe = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user || user.isAdmin) {
        res.status(404);
        throw new Error('User not found');
    }

    const nextName = String(req.body.name || '').trim();
    const profileImage = String(req.body.profileImage || '').trim();

    if (nextName) {
        user.name = nextName;
    }

    if (profileImage) {
        if (profileImage.startsWith('data:image/')) {
            user.imageUrl = await uploadProfileImageToCloudinary(profileImage);
        } else if (/^https?:\/\//i.test(profileImage)) {
            user.imageUrl = profileImage;
        } else {
            res.status(400);
            throw new Error('Invalid profile image');
        }
    }

    await user.save();

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        imageUrl: user.imageUrl || '',
        message: 'Profile updated successfully',
    });
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    if (!isEmailConfigured()) {
        res.status(500);
        throw new Error('Email service is not configured on server');
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found with that email');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const queued = await sendResetPasswordEmail({
        id: user._id,
        name: user.name,
        email: user.email,
        resetUrl,
    });

    if (!queued) {
        res.status(503);
        throw new Error('Could not send reset email right now. Please try again shortly.');
    }

    res.status(200).json({ message: 'Password reset link sent to email' });
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now login.' });
};

export const googleAuthStart = async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        res.status(500);
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getGoogleCallbackUrl(req),
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const googleLogin = async (req, res) => {
    const { code, error } = req.query;
    const clientRedirect = `${process.env.CLIENT_URL || ''}/auth/sign-in`;

    if (error) {
        return res.redirect(`${clientRedirect}?google_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect(`${clientRedirect}?google_error=missing_code`);
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code.toString(),
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: getGoogleCallbackUrl(req),
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            throw new Error(`Google token exchange failed: ${errText}`);
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData.id_token) {
            throw new Error('Google did not return id_token');
        }

        const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
        if (!verifyResponse.ok) {
            const errText = await verifyResponse.text();
            throw new Error(`Google token verification failed: ${errText}`);
        }

        const profile = await verifyResponse.json();
        if (profile.aud !== process.env.GOOGLE_CLIENT_ID) {
            throw new Error('Google token audience mismatch');
        }

        if (!profile.email || profile.email_verified !== 'true') {
            throw new Error('Google account email is not verified');
        }

        let user = await User.findOne({ email: profile.email });

        if (!user) {
            const generatedPassword = crypto.randomBytes(24).toString('hex');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(generatedPassword, salt);
            user = await User.create({
                name: profile.name || profile.email.split('@')[0],
                email: profile.email,
                password: hashedPassword,
                isVerified: true,
                isAdmin: shouldGrantAdmin(profile.email),
                imageUrl: profile.picture || '',
            });
        }

        generateToken(res, user._id);
        return res.redirect(`${process.env.CLIENT_URL || ''}/`);
    } catch (error) {
        console.error('Google OAuth failed:', error.message);
        return res.redirect(`${clientRedirect}?google_error=oauth_failed`);
    }
};
