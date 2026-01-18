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
      <div className="bg-main flex flex-col gap-2">
         {current.yt.map((v) => (
            <div
               key={v.id}
               className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2 text-nowrap truncate"
               onClick={() => handleClick(v.id)}
               onContextMenu={() => updateDefaultVideo({ track: current, youtubeVideoId: v.id })}
            >
               <img src={v.thumbnailUrl} alt={v.title} className="w-full rounded-md" />
               <h3 className="text-white font-semibold text-lg">{v.title}</h3>
               <p className="text-gray-400">By: {v.author}</p>
               <p className="text-gray-400">Views: {v.views.toLocaleString()}</p>
               <p className="text-gray-400">Published at: {new Date(v.publishedAt).toLocaleDateString()}</p>
            </div>
         ))}
      </div>
   )
}
