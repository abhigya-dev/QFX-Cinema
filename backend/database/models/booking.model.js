import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    showId: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    seatIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true }],
    totalAmount: { type: Number, required: true },
    stripeSessionId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    ticketEmailSent: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const Booking = mongoose.model("Booking", BookingSchema);
export default Booking;
