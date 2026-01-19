import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { trpc } from '../utils/trpc'

export default function YtVideoCards() {
   const { play, current, updateDefaultVideo } = useAudioStore()

   const mutation = trpc.tracks.updateDefaultVideo.useMutation()
   const handleClick = (ytId: string) => {
      if (!current?.spotify?.id) return
      mutation.mutate({ trackId: current.id, youtubeVideoId: ytId })
      play({ track: current!, forceVideoId: ytId })
   }

   if (!current?.yt || current.yt.length <= 1 || !current.spotify?.id) return null
   return (
      <div className="flex flex-col gap-4 px-3 py-4 overflow-y-auto h-full">
         {current.yt.map((v) => (
            <div
               key={v.id}
               className="bg-accent/5 text-sm border-l-4 text-text-subtle border-accent/50 rounded-lg p-3 flex flex-col gap-1"
               onClick={() => handleClick(v.id)}
               onContextMenu={() => updateDefaultVideo({ track: current, youtubeVideoId: v.id })}
            >
               <img src={v.thumbnailUrl} alt={v.title} className="w-full rounded-md" />
               <p className="text-white font-medium text-lg/6 w-full line-clamp-2 mb-1 mt-2">{v.title}</p>
               <p>By: {v.author}</p>
               <p className="flex gap-2">
                  <span>{v.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
               </p>
            </div>
         ))}
      </div>
   )
}
