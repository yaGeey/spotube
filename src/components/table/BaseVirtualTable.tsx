import React, { useEffect, useRef, useState } from 'react'
import {
   useReactTable,
   getCoreRowModel,
   flexRender,
   SortingState,
   getSortedRowModel,
   getFilteredRowModel,
   ColumnFiltersState,
   ColumnDef,
   Row,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { twMerge } from 'tailwind-merge'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import useContextMenu from '@/src/hooks/useContextMenu'
import ContextMenu, { ContextMenuItem } from '../ContextMenu'
import { ViewTrackModel } from '@/src/utils/currentTrackAdapters'

type BaseVirtualTableProps<T extends { track: any }> = {
   data: T[]
   columns: ColumnDef<T, any>[]
   gridTemplate: string
   getRowId: (item: T) => string | number
   getContextMenuItems: (item: T) => ContextMenuItem[]
   FilterContextProvider?: React.ComponentType<{ value: ColumnFiltersState; children: React.ReactNode }>
   trackAdapterFn: (t: any) => ViewTrackModel
}

const DefaultProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

export default function BaseVirtualTable<T extends { track: any }>({
   data,
   columns,
   gridTemplate,
   getRowId,
   getContextMenuItems,
   FilterContextProvider = DefaultProvider,
   trackAdapterFn,
}: BaseVirtualTableProps<T>) {
   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

   const parentRef = useRef<HTMLDivElement>(null)

   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      state: { sorting, columnFilters },
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

   // sync to store
   useEffect(() => {
      const newRows = table.getFilteredRowModel().rows.map((row) => row.original.track)
      const currentTracks = useAudioStore.getState().tracks

      // compare rows as text
      const adapted = newRows.map((track) => trackAdapterFn(track))
      if (JSON.stringify(adapted) !== JSON.stringify(currentTracks)) {
         console.log('🔄 Updating store tracks from table')
         useAudioStore.getState().setTracks(adapted)
      }
   }, [table.getFilteredRowModel().rows, trackAdapterFn])

   // Context Menu Logic
   const { handleContextMenu, left, top, isOpen } = useContextMenu()
   const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([])

   const onContextMenu = (e: React.MouseEvent, item: T) => {
      const items = getContextMenuItems(item)
      setMenuItems(items)
      handleContextMenu(e)
   }

   return (
      <FilterContextProvider value={columnFilters}>
         {isOpen && <ContextMenu left={left} top={top} items={menuItems} />}

         <div ref={parentRef} className="h-[calc(100dvh-200px)] overflow-auto w-full relative">
            {/* Header */}
            <div
               className="sticky py-2 top-0 z-10 bg-main-lighter border-b border-white/10 text-text-subtle text-xs font-medium uppercase tracking-wider"
               style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
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

            {/* Body */}
            <div
               style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
               }}
            >
               {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                     <VirtualizedRow
                        key={row.id}
                        row={row}
                        virtualRow={virtualRow}
                        gridTemplate={gridTemplate}
                        onContextMenu={onContextMenu}
                        getRowId={getRowId}
                        trackAdapterFn={trackAdapterFn}
                     />
                  )
               })}
            </div>
         </div>
      </FilterContextProvider>
   )
}

const VirtualizedRow = React.memo(
   ({
      row,
      virtualRow,
      gridTemplate,
      onContextMenu,
      getRowId,
      trackAdapterFn,
   }: {
      row: Row<any>
      virtualRow: any
      gridTemplate: string
      onContextMenu: (e: React.MouseEvent, item: any) => void
      getRowId: (item: any) => string | number
      trackAdapterFn: (t: any) => ViewTrackModel
   }) => {
      const currentId = useAudioStore((state) => state.current?.id)
      const isPlaying = currentId === getRowId(row.original)
      const isYtLoading = useAudioStore((state) => state.isYtLoading)

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
               gridTemplateColumns: gridTemplate,
            }}
            onDoubleClick={() => useAudioStore.getState().play({ track: trackAdapterFn(row.original.track) })}
            onContextMenu={(e) => onContextMenu(e, row.original)}
         >
            {row.getVisibleCells().map((cell) => (
               <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
            ))}
         </div>
      )
   },
   (p, n) => {
      // Need to check if isYtLoading changed only if this row is active?
      // Or generally just strict check on row props + simple store props
      // Note: In original code, it checked `p.isYtLoading === n.isYtLoading`.
      // Since `isYtLoading` comes from hook inside component, React.memo might be tricky if we don't pass it.
      // But here we use store hook INSIDE the component, so wrapper re-renders aren't controlled by props alone for store state.
      // Actually, if using Zustand inside, React.memo props comparison won't stop play state update.
      return p.getRowId(p.row.original) === n.getRowId(n.row.original) && p.virtualRow.start === n.virtualRow.start
   },
)
VirtualizedRow.displayName = 'VirtualizedRow'
