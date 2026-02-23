import mongoose from "mongoose";

const SeatSchema = new mongoose.Schema({
    showId: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seatNumber: { type: String, required: true },
    row: { type: String, required: true },
    type: { type: String, enum: ['normal', 'premium'], default: 'normal' },
    status: { type: String, enum: ['available', 'reserved', 'booked'], default: 'available' },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reservedUntil: { type: Date },
}, { timestamps: true });

SeatSchema.index({ showId: 1, seatNumber: 1 }, { unique: true });

const Seat = mongoose.model("Seat", SeatSchema);
export default Seat;
