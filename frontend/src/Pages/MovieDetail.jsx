import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeartIcon, PlayCircleIcon, Star } from "lucide-react";
import timeFormat from "../lib/timeFormat";
import blurSvg from "../assets/blur.svg";
import SelectDate from "../Components/SelectDate";
import MovieCard from "../Components/MovieCard";
import { api } from "../lib/api";
import { normalizeMovie, normalizeShowDateMap } from "../lib/normalizers";
import { useAuth } from "../context/AuthContext";
import { isFavoriteMovie, toggleFavoriteMovie } from "../lib/favorites";
import toast from "react-hot-toast";
import Loader from "../Components/Loader";

const MovieDetail = () => {
  const movieId = useParams().id;
  const [movie, setMovie] = useState(null);
  const [referenceMovies, setReferenceMovies] = useState([]);
  const [showDateMap, setShowDateMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [favoriteTick, setFavoriteTick] = useState(0);
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { user, isClientAuthenticated } = useAuth();
  const releaseYear = movie?.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

  useEffect(() => {
    const fetchMovieData = async () => {
      try {
        const [moviePayload, moviesPayload, showsPayload] = await Promise.all([
          api.get(`/movies/${movieId}`),
          api.get('/movies/now-showing'),
          api.get(`/shows/movie/${movieId}`),
        ]);

        const currentMovie = normalizeMovie(moviePayload);
        const allMovies = (moviesPayload || []).map(normalizeMovie);
        setMovie(currentMovie);
        setReferenceMovies(allMovies.filter((item) => item._id !== movieId));
        setShowDateMap(normalizeShowDateMap(showsPayload || []));
      } catch {
        setMovie(null);
        setReferenceMovies([]);
        setShowDateMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [movieId]);

  const isFavorite = useMemo(() => {
    if (!isClientAuthenticated || !user?._id || !movie?._id) {
      return false
    }
    return isFavoriteMovie(user._id, movie._id)
  }, [isClientAuthenticated, user?._id, movie?._id, favoriteTick])

  const handleToggleFavorite = () => {
    if (!isClientAuthenticated || !user?._id) {
      toast.error('Please login to use favorites')
      navigate('/auth/sign-in')
      return
    }
    const next = toggleFavoriteMovie(user._id, movie._id)
    setFavoriteTick((value) => value + 1)
    toast.success(next.includes(movie._id) ? 'Added to favorites' : 'Removed from favorites')
  }

  const handleShowMore = () => {
    navigate("/movies");
    scrollTo(0, 0);
  };

  if (loading) {
    return <Loader />
  }

  if (!movie) {
    return (
      <div className="flex h-screen p-10 justify-center items-center">
        <h1 className="font-bold text-2xl">
          Oops! No Movie Available with id: {movieId}
        </h1>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col  px-5 py-30 lg:px-45 lg:py-50  relative overflow-hidden ">
        <img src={blurSvg} alt="" className='absolute lg:top-20 top-90 w-45 h-60 left-5 lg:left-90 lg:w-70 lg:h-80 object-cover' />

        <div className="flex z-30 flex-wrap">
          <img src={movie.poster_path} alt="" className="lg:h-100 lg:w-70  h-80 w-60 object-contain lg:object-cover bg-no-repeat rounded-lg mx-auto" />
          <div className="flex flex-col gap-3 py-5 lg:px-10">
            <p className="text-primary-dull text-md">{movie.original_language?.toUpperCase() || movie.language || 'ENGLISH'}</p>
            <h1 className="lg:text-4xl text-2xl w-fit font-bold">{movie.title}</h1>

            <div className="flex gap-2 items-center">
              <Star size={20} fill="#D63858" color="#D63858" />
              <p className="text-gray-300">{(movie.vote_average || 0).toFixed(1)} User Rating</p>
            </div>

            <p className="lg:w-2xl w-fit text-gray-300 text-sm">{movie.overview}</p>
            <p className="flex items-center">
              {timeFormat(movie.runtime || 0)} &bull; {(movie.genres || []).map((genre) => genre.name).join(",")} &bull; {releaseYear}
            </p>

            <div className="flex gap-5 items-center flex-wrap justify-start mt-5 overflow-hidden">
              <button className="flex gap-2 items-center bg-gray-800 px-5 py-2 rounded-md"><PlayCircleIcon size={20} /> Watch Trailer</button>
              <a href="#selectDate" className="flex gap-2 items-center bg-primary-dull lg:px-5 px-10 py-2 rounded-md">Buy Tickets</a>
              <button type="button" onClick={handleToggleFavorite} className="bg-gray-600 p-2 rounded-full flex items-center justify-center cursor-pointer">
                <HeartIcon size={20} fill={isFavorite ? "#D63858" : "none"} color={isFavorite ? "#D63858" : "currentColor"} />
              </button>
            </div>
          </div>
        </div>

        {(movie.casts || []).length > 0 && (
          <div className="flex flex-col py-15 gap-11 lg:gap-9 lg:px-7 lg:pt-25 overflow-hidden">
            <p className="text-lg font-bold">Your Favorite Cast</p>

            <div ref={scrollRef} className="flex gap-5 overflow-x-auto hide-scrollbar-x items-center cursor-grab"
              onWheel={(event) => {
                event.preventDefault();
                scrollRef.current.scrollLeft += event.deltaY;
              }}>
              {movie.casts.slice(0, 12).map((cast, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 items-center h-36 min-w-22.5 transition-transform hover:scale-105"
                >
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden">
                    <img
                      src={cast.profile_path}
                      alt="cast-img"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p className="text-xs line-clamp-2 text-center">
                    {cast.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <SelectDate showDate={showDateMap} id={movie._id} />
        </div>

        <div className="flex flex-col px-1 py-5 mt-15 lg:mt-8 gap-5">
          <h1 className="font-bold text-lg">You May Also Like</h1>

          <div className="grid grid-cols-1  lg:grid-cols-4 gap-3">
            {referenceMovies.slice(0, 4).map((item) => (
              <MovieCard key={item._id} movieDetail={item} />
            ))}
          </div>
          <button className='flex self-center bg-primary-dull px-4 py-2 rounded-md cursor-pointer m-8' onClick={handleShowMore}>Show more</button>
        </div>
      </div>
    </>
  )
}

export default MovieDetail
