import {
   ColumnDef,
   ColumnFiltersState,
   flexRender,
   getCoreRowModel,
   getFilteredRowModel,
   getSortedRowModel,
   Row,
   SortingState,
   useReactTable,
} from '@tanstack/react-table'
import React, { useEffect, useRef, useState } from 'react'
import { TableFiltersContext } from './TableContext'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { useVirtualizer } from '@tanstack/react-virtual'
import { PlaylistItemWithRelations } from '@/electron/lib/prisma'
import { twMerge } from 'tailwind-merge'
import { ViewTrackModel } from '@/src/utils/currentTrackAdapters'

const GRID_TEMPLATE = '50px minmax(300px, 1fr) 120px 80px 200px'

export default function TableBase<T>({
   data,
   columns,
   trackAdapterFn,
   getRowTrackFn,
   row,
}: {
   data: T[]
   columns: ColumnDef<T>[]
   row: React.ReactNode
   getRowTrackFn: (row: Row<T>) => T
   trackAdapterFn: (t: any) => ViewTrackModel
}) {
   const play = useAudioStore((state) => state.play)
   const current = useAudioStore((state) => state.current)
   const setTracks = useAudioStore((state) => state.setTracks)
   const isYtLoading = useAudioStore((state) => state.isYtLoading)
   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
   const parentRef = useRef<HTMLDivElement>(null)
   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      state: {
         sorting,
         columnFilters,
      },
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
   })
   const { rows } = table.getRowModel()

   const virtualizer = useVirtualizer({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 52,
      overscan: 5,
   })

   useEffect(() => {
      const newRows = table.getFilteredRowModel().rows.map(getRowTrackFn)
      const currentTracks = useAudioStore.getState().tracks

      const transformed = newRows.map((t) => trackAdapterFn(t))
      if (JSON.stringify(transformed) !== JSON.stringify(currentTracks)) {
         console.log('🔄 Updating tracks from table filter...')
         setTracks(transformed)
      }
   }, [setTracks, table.getFilteredRowModel().rows])

   return (
      <TableFiltersContext.Provider value={columnFilters}>
         <div ref={parentRef} className="h-[calc(100dvh-200px)] overflow-auto w-full relative">
            <div
               className="sticky py-2 top-0 z-10 bg-main-lighter border-b border-white/10 text-text-subtle text-xs font-medium uppercase tracking-wider"
               style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_TEMPLATE,
               }}
            >
               {table.getFlatHeaders().map((header) => (
                  <div
                     key={header.id}
                     className={header.column.getCanSort() ? 'cursor-pointer select-none hover:text-white' : ''}
                     onClick={header.column.getToggleSortingHandler()}
                  >
                     {flexRender(header.column.columnDef.header, header.getContext())}
                     {{ asc: ' ▲', desc: ' ▼' }[header.column.getIsSorted() as string] ?? null}
                  </div>
               ))}
            </div>
            <div
               style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
               }}
            >
               {virtualizer.getVirtualItems().map((virtualRow, index) => {
                  const row = rows[virtualRow.index]
                  return (
                     <VirtualizedRow
                        key={row.id}
                        row={row}
                        virtualRow={virtualRow}
                        play={play}
                        index={index}
                        isYtLoading={isYtLoading}
                        handleDeleteTrack={handleDeleteTrack}
                     />
                  )
               })}
            </div>
         </div>
      </TableFiltersContext.Provider>
   )
}

const VirtualizedRow = React.memo(
   ({
      row,
      virtualRow,
      play,
      isYtLoading,
      trackAdapterFn,

      ...props
   }: {
      row: Row<PlaylistItemWithRelations>
      virtualRow: any
      play: (track: any) => void
      index: number
      isYtLoading: boolean
      trackAdapterFn: (t: any) => ViewTrackModel

      props: React.HTMLAttributes<HTMLDivElement>
   }) => {
      const isPlaying = useAudioStore((state) => state.current?.id === row.original.trackId)

      return (
         <div
            className={twMerge(
               'grid items-center px-2 absolute top-0 left-0 w-full hover:bg-white/10 transition-colors group',
               isPlaying && 'bg-white/10',
               isYtLoading && 'opacity-60',
            )}
            style={{
               height: `${virtualRow.size}px`,
               transform: `translateY(${virtualRow.start}px)`,
               gridTemplateColumns: GRID_TEMPLATE,
            }}
            onDoubleClick={() => useAudioStore.getState().play({ track: trackAdapterFn(row.original.track) })}
            {...props}
         >
            {row.getVisibleCells().map((cell) => (
               <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
            ))}
         </div>
      )
   },
   (p, n) =>
      p.row.original.id === n.row.original.id && p.virtualRow.start === n.virtualRow.start && p.isYtLoading === n.isYtLoading,
)
VirtualizedRow.displayName = 'TableRow'
