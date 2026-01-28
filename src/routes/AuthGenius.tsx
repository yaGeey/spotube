// DraggableSourceItem.tsx
import { DragStartEvent, useDraggable } from '@dnd-kit/core'

export const DraggableSourceItem = ({ item }: { item: Item }) => {
   const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `source-${item.id}`, // Унікальний ID для dnd-kit
      data: item, // Передаємо дані об'єкта, щоб отримати їх при дропі
   })

   return (
      <div
         ref={setNodeRef}
         {...listeners}
         {...attributes}
         className={`p-3 bg-gray-700 rounded cursor-grab mb-2 border border-gray-600 
        ${isDragging ? 'opacity-40' : 'opacity-100 hover:bg-gray-600'}`}
      >
         {item.title}
      </div>
   )
}
// TableDropZone.tsx
import { useDroppable } from '@dnd-kit/core'

const TableDropZone = ({ children }: { children: React.ReactNode }) => {
   const { setNodeRef, isOver } = useDroppable({
      id: 'playlist-table-zone',
   })

   return (
      <div
         ref={setNodeRef}
         className={isOver ? 'border-accent bg-accent/10' : 'border-transparent bg-gray-900'}
      >
         {children}

         {/* Підказка, якщо таблиця пуста або ми тягнемо над нею */}
         {isOver && <div className="text-center p-4 text-accent font-bold">Drop to add!</div>}
      </div>
   )
}
// Page.tsx
import React, { useState } from 'react'
import { DndContext, DragOverlay, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

const sourceItems = [
   { id: 's1', title: 'New Song A', artist: 'Artist A' },
   { id: 's2', title: 'New Song B', artist: 'Artist B' },
]
type Item = (typeof sourceItems)[number]

export default function DragToTablePage() {
   const [tableData, setTableData] = useState<Item[]>([])
   const [activeDragItem, setActiveDragItem] = useState<Item | null>(null) // for DragOverlay

   // Налаштування TanStack Table
   const table = useReactTable({
      data: tableData,
      columns: [
         { accessorKey: 'title', header: 'Title' },
         { accessorKey: 'artist', header: 'Artist' },
      ],
      getCoreRowModel: getCoreRowModel(),
   })

   const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

   // --- ЛОГІКА DROP ---
   const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event
      setActiveDragItem(null)

      if (over && over.id === 'playlist-table-zone') {
         const newItem = active.data.current as Item // з useDraggable

         // Додаємо в таблицю (генеруємо новий ID, щоб уникнути конфліктів ключів)
         setTableData((prev) => [...prev, { ...newItem, id: `${newItem.id}-${Date.now()}` }])
      }
   }

   const handleDragStart = (e: DragStartEvent) => {
      console.log(e)
      setActiveDragItem(e.active.data.current as Item)
   }

   return (
      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
         <div className="flex gap-6 h-screen p-6 bg-black text-white">
            {/* ЛІВА ПАНЕЛЬ: Список */}
            <div className="w-1/4">
               <h2 className="text-xl font-bold mb-4">Library</h2>
               {sourceItems.map((item) => (
                  <DraggableSourceItem key={item.id} item={item} />
               ))}
            </div>

            {/* ПРАВА ПАНЕЛЬ: Таблиця */}
            <div className="w-3/4 flex flex-col">
               <h2 className="text-xl font-bold mb-4">Playlist Table</h2>

               <TableDropZone>
                  {/* Рендеринг TanStack Table */}
                  <table className="w-full text-left">
                     <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                           <tr key={headerGroup.id} className="border-b border-gray-700">
                              {headerGroup.headers.map((header) => (
                                 <th key={header.id} className="p-2">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                 </th>
                              ))}
                           </tr>
                        ))}
                     </thead>
                     <tbody>
                        {table.getRowModel().rows.map((row) => (
                           <tr key={row.id} className="border-b border-gray-800 hover:bg-gray-800">
                              {row.getVisibleCells().map((cell) => (
                                 <td key={cell.id} className="p-2">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                 </td>
                              ))}
                           </tr>
                        ))}
                     </tbody>
                  </table>

                  {tableData.length === 0 && (
                     <div className="p-10 text-center text-gray-500">Drag songs here to add them to the table</div>
                  )}
               </TableDropZone>
            </div>
         </div>

         {/* ВІЗУАЛІЗАЦІЯ ПІД ЧАС ДРАГУ */}
         <DragOverlay>
            {activeDragItem ? (
               <div className="p-3 bg-accent text-white rounded shadow-xl w-[200px] border border-white/20">
                  {activeDragItem.title} (Adding...)
               </div>
            ) : null}
         </DragOverlay>
      </DndContext>
   )
}
