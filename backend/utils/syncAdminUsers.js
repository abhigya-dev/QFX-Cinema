import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../database/models/user.model.js';

const parseAdminEmails = () =>
    (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

export const syncAdminUsers = async () => {
    try {
        const adminEmails = parseAdminEmails();
        if (adminEmails.length === 0) return;

        // Skip quietly if Mongo is not connected.
        if (mongoose.connection.readyState !== 1) return;

        const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Remove admin access from every account not listed in ADMIN_EMAILS.
        await User.updateMany(
            { email: { $nin: adminEmails }, isAdmin: true },
            { $set: { isAdmin: false } }
        );

        for (const email of adminEmails) {
            await User.findOneAndUpdate(
                { email },
                {
                    $set: {
                        name: 'QFX Admin',
                        email,
                        password: hashedPassword,
                        isAdmin: true,
                        isVerified: true,
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                }
            );
        }

        console.log(`Admin account sync complete for ${adminEmails.length} account(s).`);
    } catch (error) {
        console.error('Admin account sync failed:', error.message);
    }
};
