import { useDroppable } from '@dnd-kit/core'

export default function TableDropZone({ children }: { children: React.ReactNode }) {
   const { setNodeRef, isOver } = useDroppable({
      id: 'playlist-table-zone',
   })

   return (
      <div ref={setNodeRef} className={isOver ? 'border-accent bg-accent/10' : ''}>
         {children}

         {/* Підказка, якщо таблиця пуста або ми тягнемо над нею */}
         {isOver && <div className="text-center p-4 text-accent font-bold">Drop to add!</div>}
      </div>
   )
}
