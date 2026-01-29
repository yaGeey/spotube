import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
   faPlay,
   faEllipsis,
   faClock,
   faCertificate,
   faCheck,
   faArrowUpRightFromSquare,
   faFire,
   faLink,
   faFingerprint,
   faDatabase,
   faChevronDown,
   faChevronUp,
} from '@fortawesome/free-solid-svg-icons'
import { trpc, vanillaTrpc } from '../../utils/trpc'
import { Link, useLocation } from 'react-router-dom'
import SpotifyTracksTable from '@/src/components/spotifyTable/TableSpotify'
import Loading from '@/src/components/states/Loading'
import Error from '@/src/components/states/Error'
import VideoSlot from '@/src/components/player/VideoSlot'

const formatNumber = (num: number) => {
   return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num)
}

const SpotifyArtist = () => {
   const location = useLocation()
   const artistId = new URLSearchParams(location.search).get('id')

   // States for toggling "Show More"
   const [showAllTracks, setShowAllTracks] = useState(false)
   const [showAllAlbums, setShowAllAlbums] = useState(false)

   const { data, isLoading, error } = trpc.spotify.getFullArtist.useQuery(artistId!, { enabled: Boolean(artistId) })
   useEffect(() => {
      if (data?.artist) vanillaTrpc.discord.lookingAtSpotifyArtist.mutate(data?.artist)
   }, [data?.artist])

   if (!artistId) return <Error msg="No artist ID provided in the URL." />
   if (isLoading) return <Loading />
   if (error || !data) return <Error msg={error?.message} />

   const { artist, topTracks, albums } = data
   const headerImage = artist.images?.[0]?.url

   // Logic for slicing data
   const displayedTracks = showAllTracks ? topTracks : topTracks.slice(0, 5)
   const displayedAlbums = showAllAlbums ? albums : albums.slice(0, 8)

   const spotifyUrl = artist.external_urls?.spotify
   return (
      <div className="min-h-screen bg-main text-text pb-24 font-sans overflow-x-hidden">
         <VideoSlot />
         {/* Header Section */}
         <div className="relative h-[40vh] min-h-[340px] w-full flex items-end p-8 overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: `url(${headerImage})` }}>
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-main"></div>
            </div>

            <div className="relative z-10 flex flex-col gap-2">
               <div className="flex items-center gap-2 text-text mb-2">
                  <div className="relative flex items-center justify-center text-accent">
                     <FontAwesomeIcon icon={faCertificate} className="text-2xl" />
                     <FontAwesomeIcon icon={faCheck} className="absolute text-[10px] text-main" transform="shrink-4" />
                  </div>
                  {/* Added 'type' field */}
                  <span className="text-sm font-medium tracking-wider capitalize">Verified {artist.type || 'Artist'}</span>
               </div>

               <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-lg leading-none">
                  {artist.name}
               </h1>

               {/* Genres */}
               {artist.genres && artist.genres.length > 0 && (
                  <p className="text-text-subtle text-sm md:text-base font-medium capitalize mt-2 drop-shadow-md">
                     {artist.genres.slice(0, 5).join(' • ')}
                  </p>
               )}

               <div className="flex items-center gap-4 mt-1 text-base font-medium drop-shadow-md">
                  {/* Followers */}
                  <span>{formatNumber(artist.followers?.total || 0)} followers</span>

                  {/* Added 'popularity' field */}
                  {artist.popularity !== undefined && (
                     <div className="flex items-center gap-1.5 text-text-subtle/80 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <FontAwesomeIcon
                           icon={faFire}
                           className={artist.popularity > 80 ? 'text-orange-500' : 'text-text-subtle'}
                        />
                        <span className="text-sm">Pop: {artist.popularity}%</span>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Action Bar */}
         <div className="px-8 py-6 flex items-center gap-6 sticky top-0 z-20 bg-main/95 backdrop-blur-sm">
            <button className="w-14 h-14 rounded-full bg-accent hover:bg-accent-darker flex items-center justify-center transition-transform hover:scale-105 shadow-lg text-main group">
               <FontAwesomeIcon icon={faPlay} className="ml-1 text-2xl" />
            </button>
            <button className="px-6 py-1.5 border border-text-subtle rounded-full text-sm font-bold hover:border-text hover:scale-105 transition-all uppercase tracking-widest text-text">
               Follow
            </button>

            {/* Added 'external_urls' button */}
            {spotifyUrl && (
               <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Spotify"
                  className="text-text-subtle hover:text-text transition-colors"
               >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-2xl" />
               </a>
            )}

            <button className="text-text-subtle hover:text-text transition-colors">
               <FontAwesomeIcon icon={faEllipsis} className="text-2xl" />
            </button>
         </div>

         <div className="px-8 flex flex-col gap-12 mt-4 max-w-[1920px] mx-auto">
            {/* Popular Tracks Section */}
            <section>
               <h2 className="text-2xl font-bold mb-6 text-text">Popular</h2>
               <div className="flex flex-col">
                  <div className="grid grid-cols-[20px_4fr_2fr_minmax(60px,1fr)] gap-4 px-4 pb-2 border-b border-text-subtle/20 text-text-subtle text-sm mb-2 uppercase tracking-wider">
                     <span className="text-center">#</span>
                     <span>Title</span>
                     <span className="text-right">Plays</span>
                     <div className="flex justify-end pr-2">
                        <FontAwesomeIcon icon={faClock} />
                     </div>
                  </div>

                  {<SpotifyTracksTable data={displayedTracks} />}

                  {/* Show More Button for Tracks */}
                  {topTracks.length > 5 && (
                     <button
                        onClick={() => setShowAllTracks(!showAllTracks)}
                        className="mt-4 text-xs font-bold uppercase tracking-widest text-text-subtle hover:text-text transition-colors self-start ml-4 flex items-center gap-2"
                     >
                        {showAllTracks ? 'Show Less' : 'See More'}
                        <FontAwesomeIcon icon={showAllTracks ? faChevronUp : faChevronDown} />
                     </button>
                  )}
               </div>
            </section>

            {/* Discography Section */}
            <section>
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-text">Discography</h2>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {displayedAlbums.map((album) => (
                     <Link
                        key={album.id}
                        to={`/spotify/album?id=${album.id}`}
                        className="p-4 bg-main-lighter/50 hover:bg-main-lighter rounded-lg transition-all duration-300 group cursor-pointer"
                     >
                        <div className="relative mb-4 shadow-lg rounded-md overflow-hidden aspect-square">
                           <img src={album.images?.[0]?.url} alt={album.name} className="w-full h-full object-cover" />
                           <div className="absolute right-2 bottom-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 shadow-xl z-10">
                              <button className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-main hover:scale-105 transition-transform">
                                 <FontAwesomeIcon icon={faPlay} className="text-xl ml-1" />
                              </button>
                           </div>
                        </div>
                        <h3 className="font-bold truncate text-text mb-1" title={album.name}>
                           {album.name}
                        </h3>
                        <p className="text-sm text-text-subtle capitalize">
                           {album.release_date?.split('-')[0]} • {album.album_type || 'Album'}
                        </p>
                     </Link>
                  ))}
               </div>

               {/* Show All Button for Albums */}
               {albums.length > 10 && (
                  <div className="mt-8 flex justify-center">
                     <button
                        onClick={() => setShowAllAlbums(!showAllAlbums)}
                        className="px-8 py-2 rounded-full bg-main-lighter hover:bg-main-lighter/80 text-text font-bold text-sm tracking-wider uppercase transition-colors"
                     >
                        {showAllAlbums ? 'Show Less' : 'Show All'}
                     </button>
                  </div>
               )}
            </section>

            {/* Metadata Section (Added id, uri, href) */}
            <section className="pt-8 border-t border-text-subtle/20">
               <h3 className="text-lg font-bold mb-4 text-text flex items-center gap-2">
                  <FontAwesomeIcon icon={faDatabase} className="text-accent" /> Metadata
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-text-subtle bg-main-lighter/30 p-4 rounded-lg">
                  <div className="flex flex-col gap-1">
                     <span className="text-xs uppercase opacity-50 flex items-center gap-1">
                        <FontAwesomeIcon icon={faFingerprint} /> Spotify ID
                     </span>
                     <span className="text-text select-all">{artist.id}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-xs uppercase opacity-50 flex items-center gap-1">
                        <FontAwesomeIcon icon={faLink} /> Spotify URI
                     </span>
                     <span className="text-text select-all">{artist.uri}</span>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                     <span className="text-xs uppercase opacity-50 flex items-center gap-1">
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} /> API HREF
                     </span>
                     <span className="text-text select-all break-all">{artist.href}</span>
                  </div>
               </div>
            </section>
         </div>
      </div>
   )
}

export default SpotifyArtist
