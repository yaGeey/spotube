import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
   useReactTable,
   getCoreRowModel,
   flexRender,
   createColumnHelper,
   SortingState,
   getSortedRowModel,
   getFilteredRowModel,
   ColumnFiltersState,
   Row,
} from '@tanstack/react-table'
import { twMerge } from 'tailwind-merge'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { formatDuration } from '../../utils/time'
import { useVirtualizer } from '@tanstack/react-virtual'
import StatusCell from '../table/StatusCell'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SimplifiedTrack, Track } from '@spotify/web-api-ts-sdk'
import InfoCellSpotify from './InfoCellSpotify'
import { fromSpotifyToCurrent } from '@/src/utils/currentTrackAdapters'
import { TableSpotifyFilterContext } from './TableSpotifyContext'
const GRID_TEMPLATE = '50px minmax(300px, 1fr) 120px 80px 200px'

// type SpotifyTrack = Omit<SimplifiedTrack | Track, 'artists'> & {
//    lastFM: PrismaJson.LastFMTrack | null
//    artists: ((Artist | SimplifiedArtist) & {
//       lastFM: PrismaJson.LastFMArtist | null
//    })[]
// }
export type SpotifyTrack = SimplifiedTrack | Track

const columnHelper = createColumnHelper<SpotifyTrack>()

export default function SpotifyTracksTable({ data }: { data: SpotifyTrack[] }) {
   const play = useAudioStore((state) => state.play)
   const setTracks = useAudioStore((state) => state.setTracks)
   const isYtLoading = useAudioStore((state) => state.isYtLoading)

   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

   const columns = useMemo(
      () => [
         // Column 1: Index / Playing State
         // TODO position
         columnHelper.accessor((row) => row.track_number, {
            id: 'index',
            header: '#',
            cell: (info) => <StatusCell trackId={info.row.original.id} posIdx={info.getValue()} />,
         }),

         // Column 2: Info (Art + Title + Artist)
         columnHelper.accessor((row) => row.artists.flatMap((a) => [a.name].filter(Boolean)), {
            id: 'info',
            header: 'Info',
            size: 350,
            filterFn: 'arrIncludesSome',
            cell: (info) => <InfoCellSpotify info={info} />,
         }),

         // Column 4: Duration
         // TODO change default yt video
         columnHelper.accessor(
            (row) => {
               const spotifyDurationMs = row.duration_ms
               if (spotifyDurationMs) return Math.floor(spotifyDurationMs / 1000)
               return 0
            },
            {
               id: 'duration',
               header: () => <FontAwesomeIcon icon={faClock} />,
               size: 100,
               cell: (info) => (
                  <div className="px-0.5 text-sm text-text-subtle font-variant-numeric tabular-nums text-center">
                     {formatDuration(info.getValue() ? info.getValue() : 0)}
                  </div>
               ),
            },
         ),
      ],
      [],
   )

   const parentRef = useRef<HTMLDivElement>(null)
   const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      state: {
         sorting,
         columnFilters,
         // columnPinning: { left: ['info'] },
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
      const newRows = table.getFilteredRowModel().rows.map((row) => row.original)
      const currentTracks = useAudioStore.getState().tracks

      const transformed = newRows.map((t) => fromSpotifyToCurrent(t))
      if (JSON.stringify(transformed) !== JSON.stringify(currentTracks)) {
         console.log('🔄 Updating tracks from table filter...')
         setTracks(transformed)
      }
   }, [setTracks, table.getFilteredRowModel().rows])

   return (
      <TableSpotifyFilterContext.Provider value={columnFilters}>
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
                     />
                  )
               })}
            </div>
         </div>
      </TableSpotifyFilterContext.Provider>
   )
}

const VirtualizedRow = React.memo(
   ({
      row,
      virtualRow,
      play,
      isYtLoading,
   }: {
      row: Row<SimplifiedTrack>
      virtualRow: any
      play: (track: any) => void
      index: number
      isYtLoading: boolean
   }) => {
      const isPlaying = useAudioStore((state) => state.current?.id === row.original.id)

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
            onDoubleClick={() => play({ track: fromSpotifyToCurrent(row.original) })}
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
