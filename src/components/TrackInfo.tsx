import { TrackCombined } from '../types/types'

export default function TrackInfo({ data }: { data: TrackCombined }) {
   const lastFm = data.yt?.[0].lastFm
   if (!data.spotify || !lastFm) return null
   return (
      <div>
         <h2 className="text-lg font-semibold">{data.spotify.title}</h2>
         <p>{data.spotify.artists}</p>
         {lastFm.track?.wiki?.content && (
            <div className="mt-4">
               <h3 className="text-md font-semibold mb-1">Track:</h3>
               <p className="text-text-subtle">{lastFm.track.wiki.content}</p>
            </div>
         )}
         {lastFm.artist?.bio?.content && (
            <div className="mt-4">
               <h3 className="text-md font-semibold mb-1">Artist:</h3>
               <p className="text-text-subtle">{lastFm.artist.bio.content}</p>
            </div>
         )}
         {lastFm.album?.wiki?.content && (
            <div className="mt-4">
               <h3 className="text-md font-semibold mb-1">Album:</h3>
               <p className="text-text-subtle">{lastFm.album.wiki.content}</p>
            </div>
         )}
      </div>
   )
}
