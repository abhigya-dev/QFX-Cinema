import mongoose from "mongoose"
import 'dotenv/config';

const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected Successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Don't crash the process – allow the server to start
        // MongoDB will reconnect automatically when available
    }
}

export default connectMongoDB