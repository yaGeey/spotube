import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { trpc } from '../utils/trpc'
import { YoutubeVideo } from '@/generated/prisma/client'
import { useDraggable } from '@dnd-kit/core'
import { twMerge } from 'tailwind-merge'
import { TrackWithRelations } from '@/electron/lib/prisma'

export default function YtVideoCards() {
   const play = useAudioStore((state) => state.play)
   const current = useAudioStore((state) => state.current)
   const updateDefaultVideo = useAudioStore((state) => state.updateDefaultVideo)

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
            <DraggableVideo
               key={v.id}
               v={v}
               handleClick={handleClick}
               current={current}
               updateDefaultVideo={updateDefaultVideo}
            />
         ))}
      </div>
   )
}

function DraggableVideo({
   v,
   handleClick,
   current,
   updateDefaultVideo,
}: {
   v: YoutubeVideo
   handleClick: (ytId: string) => void
   current: TrackWithRelations
   updateDefaultVideo: (params: { track: TrackWithRelations; youtubeVideoId: string }) => void
}) {
   const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: v.id,
      data: v,
   })

   return (
      <div
         ref={setNodeRef}
         {...listeners}
         {...attributes}
         className={twMerge(
            'bg-accent/5 text-sm border-l-4 text-text-subtle border-accent/50 rounded-lg p-3 flex flex-col gap-1',
            isDragging && 'opacity-50',
         )}
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
   )
}
