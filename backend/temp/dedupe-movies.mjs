import mongoose from 'mongoose';
import Movie from '../database/models/movie.model.js';
import Show from '../database/models/show.model.js';
import Booking from '../database/models/booking.model.js';

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

await mongoose.connect(process.env.MONGO_URI);

const movies = await Movie.find({}).sort({ createdAt: 1 }).lean();
const groups = new Map();

for (const movie of movies) {
  const key = normalize(movie.title);
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(movie);
}

let groupsMerged = 0;
let moviesRemoved = 0;

for (const [, list] of groups) {
  if (list.length < 2) continue;

  const canonical = list[0];
  const duplicates = list.slice(1);
  const duplicateIds = duplicates.map((d) => d._id);

  const showRes = await Show.updateMany(
    { movieId: { $in: duplicateIds } },
    { $set: { movieId: canonical._id } }
  );

  const bookingRes = await Booking.updateMany(
    { movieId: { $in: duplicateIds } },
    { $set: { movieId: canonical._id } }
  );

  await Movie.deleteMany({ _id: { $in: duplicateIds } });

  groupsMerged += 1;
  moviesRemoved += duplicateIds.length;

  console.log(
    `Merged '${canonical.title}' -> kept ${canonical._id}, removed ${duplicateIds.length}, reassigned shows ${showRes.modifiedCount}, bookings ${bookingRes.modifiedCount}`
  );
}

console.log('SUMMARY', { groupsMerged, moviesRemoved });

await mongoose.disconnect();
