import mongoose from "mongoose";

const MovieSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    genre: { type: [String], required: true },
    language: { type: String, required: true },
    duration: { type: Number, required: true }, // in minutes
    poster: { type: String, required: true },
    backdrop: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    releaseDate: { type: Date, required: true },
}, { timestamps: true });

const Movie = mongoose.model("Movie", MovieSchema);
export default Movie;
