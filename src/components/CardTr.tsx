import { useAudioStore } from '../hooks/useAudioStore'
import { TrackCombined } from '../types/types'
import { formatDuration, formatRelativeTime } from '../utils/time'
import { HeartIcon, MusicIcon } from './Icons'
import { twMerge as tw, twMerge } from 'tailwind-merge'
import AnimatedEqualizer from './icons/AnimatedEqualizer'
import { useNavigate } from 'react-router-dom'

export default function CardTr({ data, index }: { data: TrackCombined; index: number }) {
   const { play, current } = useAudioStore()
   const navigate = useNavigate()

   const spotify = data.spotify?.full_response.track
   const yt = data.yt

   const image = spotify?.album.images[0].url ?? data.yt?.[0].thumbnail_url
   const isPlaying = current?.yt?.[0].id === yt?.[0].id

   const handleNavigateToAI = () => {
      const title = spotify?.name ?? data.yt?.[0].title
      const artist = spotify?.artists[0]?.name ?? data.yt?.[0].author
      if (title && artist) navigate(`/ai?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`)
   }

   return (
      <tr
         className={tw(
            'group border-b border-transparent hover:bg-white/10 transition-colors cursor-default',
            isPlaying && 'bg-white/10'
         )}
         onDoubleClick={() => play({ track: data })}
      >
         {/* Index / Playing State */}
         <td className="w-12 text-center text-text-subtle">
            {isPlaying ? (
               <div className="flex justify-center">
                  <AnimatedEqualizer />
               </div>
            ) : (
               <span className="group-hover:hidden">{index}</span>
            )}
         </td>

         {/* Track Info (Art + Title + Artist) */}
         <td className="py-1.5 max-w-[300px]">
            <div className="flex items-center gap-3">
               {/* Album Art */}
               <div className="size-10 bg-neutral-800 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative">
                  {image ? (
                     <img src={image} alt="Album Art" className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-neutral-500">
                        <MusicIcon className="w-5 h-5" />
                     </div>
                  )}
               </div>

               {/* Text Info */}
               <div className="flex flex-col overflow-hidden mr-4">
                  <span
                     onClick={handleNavigateToAI}
                     className={tw(
                        'text-text font-medium hover:underline cursor-pointer truncate text-sm md:text-base',
                        isPlaying && 'text-lighter'
                     )}
                  >
                     {spotify?.name ?? data.yt?.[0].title}
                  </span>
                  <span
                     className="text-xs text-text-subtle hover:underline cursor-pointer truncate hover:text-text transition-colors"
                     onClick={() => {
                        if (!yt || yt.length === 0) return
                        console.log('artist', yt[0].lastFm?.artist?.bio?.content)
                        console.log('track', yt[0].lastFm?.track?.wiki?.content)
                        console.log('album', yt[0].lastFm?.album?.wiki?.content)
                     }}
                  >
                     {spotify?.artists.map((a) => a.name).join(', ') ?? data?.yt?.[0].author}
                  </span>
               </div>
            </div>
         </td>

         {/* Date Added */}
         <td
            className={twMerge(
               'px-1 text-sm text-text-subtle whitespace-nowrap hidden md:table-cell ',
               !spotify && 'text-red-400'
            )}
            onClick={() => {
               console.log('spotify', data.spotify?.full_response.added_at)
               console.log('yt', data.yt?.[0].published_at)
               console.log('choosed', data.spotify?.full_response.added_at ?? yt?.[0].published_at)
            }}
         >
            {formatRelativeTime(data.spotify?.full_response.added_at ?? yt?.[0].published_at ?? new Date())}
         </td>

         {/* Duration */}
         <td className="px-0.5  text-sm text-text-subtle font-variant-numeric tabular-nums text-center">
            {formatDuration(yt?.[0].duration_ms ? yt?.[0].duration_ms / 1000 : 0)}
         </td>

         {/* Tags */}
         <td className="px-0.5 text-xs text-text-subtle max-w-[150px] hidden lg:table-cell">
            <div className="line-clamp-2">{data.yt?.[0]?.lastFm?.artist?.tags.tag.map((t) => t.name).join(', ')}</div>
         </td>
      </tr>
   )
}
