import { TrackWithRelations } from '@/electron/lib/prisma'

export default function TrackInfo({ data }: { data: TrackWithRelations }) {
   const lastFm = data.lastFM
   if (!lastFm) return null
   return (
      <div>
         <h2 className="text-lg font-semibold">{data.title}</h2>
         <p>{data.artists}</p>
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
