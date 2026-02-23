import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
        select: false // Don't return password by default
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
    },
    otpExpire: {
        type: Date,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    imageUrl: {
        type: String,
        default: '',
    },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
export default User;
