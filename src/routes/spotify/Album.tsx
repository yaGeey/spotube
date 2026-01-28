import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faHeart, faEllipsis, faClock } from '@fortawesome/free-solid-svg-icons'
import { trpc } from '../../utils/trpc'
import { Link, useLocation } from 'react-router-dom'
import VideoPlayer from '@/src/components/VideoPlayer'
import SpotifyTracksTable from '@/src/components/spotifyTable/TableSpotify'

const formatDuration = (ms: number) => {
   const minutes = Math.floor(ms / 60000)
   const seconds = ((ms % 60000) / 1000).toFixed(0)
   return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`
}

const formatTotalDuration = (ms: number) => {
   const hours = Math.floor(ms / 3600000)
   const minutes = Math.floor((ms % 3600000) / 60000)
   if (hours > 0) return `${hours} hr ${minutes} min`
   return `${minutes} min`
}

const SpotifyAlbum = () => {
   const location = useLocation()
   const albumId = new URLSearchParams(location.search).get('id')

   if (!albumId) return <div className="h-screen w-full flex items-center justify-center bg-main text-text">Invalid Album ID</div>

   const { data, isLoading, error } = trpc.spotify.getAlbumWithTracks.useQuery(albumId)

   if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-main text-text">Loading...</div>
   if (error || !data)
      return <div className="h-screen w-full flex items-center justify-center bg-main text-accent">Error loading data</div>

   const { tracks, ...album } = data
   const headerImage = album.images?.[0]?.url
   const releaseYear = album.release_date?.split('-')[0]

   // Calculate total duration
   const totalDurationMs = tracks.reduce((acc: number, track: any) => acc + track.duration_ms, 0)
   const tracksToDisplay = tracks.map(t => ({...t, album}))

   return (
      <div className="min-h-screen bg-main text-text pb-24 font-sans overflow-x-hidden">
         <VideoPlayer />
         {/* Header Section */}
         <div className="relative min-h-[340px] w-full flex items-end p-8 overflow-hidden bg-gradient-to-b from-main-lighter/80 to-main">
            <div className="relative z-10 flex flex-row items-end gap-6 w-full">
               {/* Album Cover Art */}
               <div className="shrink-0 shadow-2xl shadow-black/50">
                  <img
                     src={headerImage}
                     alt={album.name}
                     className="w-32 h-32 md:w-48 md:h-48 lg:w-60 lg:h-60 object-cover rounded shadow-lg"
                  />
               </div>

               {/* Album Info */}
               <div className="flex flex-col gap-2 pb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-text">{album.album_type || 'Album'}</span>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight drop-shadow-lg leading-none mb-1">
                     {album.name}
                  </h1>

                  {/* --- Genres Section (Added) --- */}
                  {album.genres && album.genres.length > 0 && (
                     <p className="text-text-subtle text-sm font-medium capitalize drop-shadow-md">
                        {album.genres.slice(0, 5).join(' • ')}
                     </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text mt-1">
                     {/* Artist Image/Name */}
                     {album.artists.map((a, i) => (
                        <Link key={a.id} to={`/spotify/artist?id=${a.id}`} className="flex items-center gap-1">
                           <span className="font-bold hover:underline cursor-pointer">{a.name}</span>
                        </Link>
                     ))}
                     <span className="text-text-subtle">•</span>
                     <span className="text-text-subtle">{releaseYear}</span>
                     <span className="text-text-subtle">•</span>
                     <span className="text-text-subtle">{album.total_tracks} songs,</span>
                     <span className="text-text-subtle opacity-80">{formatTotalDuration(totalDurationMs)}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Action Bar */}
         <div className="px-8 py-6 flex items-center gap-6 sticky top-0 z-20 bg-main/95 backdrop-blur-sm">
            <button className="w-14 h-14 rounded-full bg-accent hover:bg-accent-darker flex items-center justify-center transition-transform hover:scale-105 shadow-lg text-main group">
               <FontAwesomeIcon icon={faPlay} className="ml-1 text-2xl" />
            </button>
            <button className="text-text-subtle hover:text-text transition-colors hover:scale-105">
               <FontAwesomeIcon icon={faHeart} className="text-3xl" />
            </button>
            <button className="text-text-subtle hover:text-text transition-colors">
               <FontAwesomeIcon icon={faEllipsis} className="text-2xl" />
            </button>
         </div>

         <div className="px-8 flex flex-col mt-4 max-w-[1920px] mx-auto">
            {/* Tracks List */}
            <section>
               <div className="flex flex-col">
                  {/* Table Header */}
                  <div className="grid grid-cols-[16px_4fr_minmax(60px,1fr)] gap-4 px-4 pb-2 border-b border-text-subtle/20 text-text-subtle text-sm mb-2 sticky top-[88px] bg-main z-10 uppercase tracking-wider">
                     <span className="text-center">#</span>
                     <span>Title</span>
                     <div className="flex justify-end pr-2">
                        <FontAwesomeIcon icon={faClock} />
                     </div>
                  </div>

                  <SpotifyTracksTable data={tracksToDisplay} />
               </div>
            </section>

            {/* Copyrights Section */}
            <div className="mt-8 pt-6 pb-12 px-4 flex flex-col gap-1 border-t border-text-subtle/10">
               <div className="text-text-subtle text-xs mb-2">
                  <p>
                     {new Date(album.release_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                     })}
                  </p>
               </div>
               {album.copyrights &&
                  album.copyrights.map((c: any, i: number) => (
                     <p key={i} className="text-[11px] text-text-subtle">
                        {c.text}
                     </p>
                  ))}
            </div>
         </div>
      </div>
   )
}

export default SpotifyAlbum
