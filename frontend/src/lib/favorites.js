const keyForUser = (userId) => `qfx_favorites_${userId}`

const read = (userId) => {
  if (!userId) return []
  try {
    const payload = localStorage.getItem(keyForUser(userId))
    return payload ? JSON.parse(payload) : []
  } catch {
    return []
  }
}

const write = (userId, ids) => {
  if (!userId) return
  localStorage.setItem(keyForUser(userId), JSON.stringify(ids))
}

export const getFavoriteMovieIds = (userId) => read(userId)

export const isFavoriteMovie = (userId, movieId) => read(userId).includes(movieId)

export const toggleFavoriteMovie = (userId, movieId) => {
  const ids = read(userId)
  const updated = ids.includes(movieId)
    ? ids.filter((id) => id !== movieId)
    : [...ids, movieId]
  write(userId, updated)
  return updated
}
