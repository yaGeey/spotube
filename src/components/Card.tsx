import { useAudioStore } from '../hooks/useAudioStore'
import { TrackCombined } from '../types/types'
import { formatDuration, formatRelativeTime, toLocale } from '../utils/time'
import { HeartIcon, MusicIcon } from './Icons'
import { twMerge as tw } from 'tailwind-merge'
import AnimatedEqualizer from './icons/AnimatedEqualizer'
import { useNavigate } from 'react-router-dom'
// TODO subgrid
export default function Card({ data, index }: { data: TrackCombined; index: number }) {
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
      <li
         className={tw('flex items-center gap-3 text-text-subtle hover:bg-white/10')}
         onDoubleClick={(e) => play({ track: data })}
      >
         {isPlaying ? <AnimatedEqualizer /> : <span>{index}</span>}
         {/* name */}
         <div className="flex items-center w-[30%] min-w-[180px]">
            {/* Album Art */}
            <div className="w-14 h-14 bg-neutral-800 mr-4 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative group">
               <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-800">
                  {image ? (
                     <img src={image} alt="Album Art" className="w-full h-full object-cover" />
                  ) : (
                     <MusicIcon className="w-6 h-6" />
                  )}
               </div>
            </div>
            {/* Track Title & Artists */}
            <div className="flex flex-col overflow-hidden">
               <span
                  onClick={handleNavigateToAI}
                  className={tw('text-text font-medium hover:underline cursor-pointer truncate', isPlaying && 'text-lighter')}
               >
                  {spotify?.name ?? data.yt?.[0].title}
               </span>
               <span className="text-xs text-text-subtle hover:underline cursor-pointer truncate hover:text-text transition-colors">
                  {spotify?.artists.map((a) => a.name).join(', ') ?? data?.yt?.[0].author}
               </span>
            </div>
            <button className="ml-4 text-text-subtle hover:text-text transition-colors">
               <HeartIcon className="w-4 h-4" />
            </button>
         </div>

         <span>{formatRelativeTime(data.spotify?.full_response.added_at ?? yt?.[0].published_at ?? new Date())}</span>
         <span>{formatDuration(yt?.[0].duration_ms ? yt?.[0].duration_ms / 1000 : 0)}</span>
         <span className="text-red-400">{!spotify ? 'yt' : ' '}</span>
         <span>artist:{data.yt?.[0]?.lastFm?.artist?.tags.tag.map((t) => t.name).join(', ')}</span>
         <span>track:{data.yt?.[0]?.lastFm?.track?.toptags.tag.map((t) => t.name).join(', ')}</span>
      </li>
   )
}
