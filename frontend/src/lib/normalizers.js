const toIsoDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeMovie = (movie) => {
  if (!movie) return null;

  const genres = Array.isArray(movie.genre)
    ? movie.genre.map((genre) => (typeof genre === 'string' ? { name: genre } : genre))
    : Array.isArray(movie.genres)
      ? movie.genres
      : [];

  return {
    ...movie,
    _id: movie._id || movie.id,
    poster_path: movie.poster_path || movie.poster || '',
    backdrop_path: movie.backdrop_path || movie.backdrop || movie.poster || movie.poster_path || '',
    overview: movie.overview || movie.description || '',
    release_date: movie.release_date || toIsoDate(movie.releaseDate),
    runtime: movie.runtime || movie.duration || 0,
    vote_average: movie.vote_average ?? movie.rating ?? 0,
    vote_count: movie.vote_count ?? movie.voteCount ?? 0,
    showPrice: movie.showPrice ?? null,
    genres,
    casts: Array.isArray(movie.casts) ? movie.casts : [],
  };
};

export const normalizeShowDateMap = (shows) => {
  const grouped = {};
  const now = Date.now();

  (shows || []).forEach((show) => {
    const baseDate = toIsoDate(show.date);
    if (!baseDate) return;
    const parsed = new Date(`${baseDate}T${show.time}`);
    if (Number.isNaN(parsed.getTime())) return;
    if (parsed.getTime() < now) return;

    if (!grouped[baseDate]) grouped[baseDate] = [];
    const dateTime = `${baseDate}T${show.time}`;
    grouped[baseDate].push({
      time: dateTime,
      showId: show._id,
    });
  });

  Object.values(grouped).forEach((values) => {
    values.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  });

  return grouped;
};
