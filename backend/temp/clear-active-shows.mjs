import mongoose from 'mongoose';
import Show from '../database/models/show.model.js';
import Seat from '../database/models/seat.model.js';
import Booking from '../database/models/booking.model.js';

const getShowDateTime = (show) => {
  const showDate = new Date(show.date);
  const isoDate = showDate.toISOString().split('T')[0];
  return new Date(`${isoDate}T${show.time}Z`);
};

await mongoose.connect(process.env.MONGO_URI);

const now = new Date();
const shows = await Show.find({}).lean();
const activeShowIds = shows
  .filter((show) => getShowDateTime(show) >= now)
  .map((show) => show._id);

if (activeShowIds.length === 0) {
  console.log('No active shows found to delete.');
  await mongoose.disconnect();
  process.exit(0);
}

const seatResult = await Seat.deleteMany({ showId: { $in: activeShowIds } });
const bookingResult = await Booking.deleteMany({ showId: { $in: activeShowIds } });
const showResult = await Show.deleteMany({ _id: { $in: activeShowIds } });

console.log('Deleted active data:', {
  activeShowsDeleted: showResult.deletedCount || 0,
  seatsDeleted: seatResult.deletedCount || 0,
  bookingsDeleted: bookingResult.deletedCount || 0,
});

await mongoose.disconnect();
