import mongoose from "mongoose";

const PendingSignupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        otp: {
            type: String,
            required: true,
        },
        otpExpire: {
            type: Date,
            required: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const PendingSignup = mongoose.model("PendingSignup", PendingSignupSchema);
export default PendingSignup;

