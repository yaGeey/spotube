import { YoutubeVideo } from '@/generated/prisma/client'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { trpc } from '../utils/trpc'
import { useState } from 'react'

export default function DndAddYtContext({
   children,
   plId,
   enabled,
}: {
   children: React.ReactNode
   plId: number
   enabled: boolean
}) {
   const [activeDragItem, setActiveDragItem] = useState<YoutubeVideo | null>(null)
   const utils = trpc.useUtils()
   const addYtVideo = trpc.playlists.addYtVideo.useMutation({
      onSuccess: () => {
         utils.playlists.getById.invalidate(plId)
         utils.combinedPlaylists.getById.invalidate(plId)
      },
   })
   function handleStartDrag(e: DragStartEvent) {
      setActiveDragItem(e.active.data.current as YoutubeVideo)
   }
   async function handleDragEnd(e: DragEndEvent) {
      const { active, over } = e
      setActiveDragItem(null)
      if (over && over.id === 'playlist-table-zone') {
         if (!enabled) {
            alert('Can only drag to local playlists')
            return
         }
         const newItem = active.data.current as YoutubeVideo
         const res = await addYtVideo.mutateAsync({
            playlistId: plId,
            data: newItem,
         })
         if (res === null) {
            confirm('This YouTube video already exists in the playlist. Add it anyway?') &&
               addYtVideo.mutate({
                  playlistId: plId,
                  data: newItem,
                  addAnyway: true,
               })
         }
      }
   }
   return (
      <DndContext onDragStart={handleStartDrag} onDragEnd={handleDragEnd}>
         {children}
         <DragOverlay dropAnimation={null}>
            {activeDragItem ? (
               <div className="p-3 bg-accent text-white rounded shadow-xl w-[200px] border border-white/20">
                  {activeDragItem.title} (Adding...)
               </div>
            ) : null}
         </DragOverlay>
      </DndContext>
   )
}
