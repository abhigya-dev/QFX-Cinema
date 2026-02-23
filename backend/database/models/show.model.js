import mongoose from "mongoose";

const ShowSchema = new mongoose.Schema({
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatreId: { type: String, required: true }, // Could be a separate model later
    date: { type: Date, required: true },
    time: { type: String, required: true },
    startsAt: { type: Date, index: true },
    totalSeats: { type: Number, required: true },
    bookedSeats: { type: Number, default: 0 },
    price: { type: Number, required: true },
}, { timestamps: true });

const Show = mongoose.model("Show", ShowSchema);
export default Show;
