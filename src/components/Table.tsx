import { useEffect, useMemo, useState } from 'react'
import {
   useReactTable,
   getCoreRowModel,
   flexRender,
   createColumnHelper,
   SortingState,
   getSortedRowModel,
   getFilteredRowModel,
   ColumnFiltersState,
} from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { useAudioStore } from '../hooks/useAudioStore'
import { TrackCombined } from '../types/types'
import { formatDuration, formatRelativeTime } from '../utils/time'
import { MusicIcon } from './Icons'
import AnimatedEqualizer from './icons/AnimatedEqualizer'

// Створюємо хелпер для типізації колонок
const columnHelper = createColumnHelper<TrackCombined>()

export default function TracksTable({ data }: { data: TrackCombined[] }) {
   const { play, current, setTracks } = useAudioStore()
   const navigate = useNavigate()
   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

   // Визначаємо колонки
   const columns = useMemo(
      () => [
         // Column 1: Index / Playing State
         columnHelper.display({
            id: 'index',
            header: '#',
            cell: (info) => {
               const track = info.row.original
               // Перевірка, чи грає цей трек
               const isPlaying = current?.yt?.[0].id === track.yt?.[0].id

               return (
                  <div className="w-12 text-center text-text-subtle">
                     {isPlaying ? (
                        <div className="flex justify-center">
                           <AnimatedEqualizer />
                        </div>
                     ) : (
                        <span className="group-hover:hidden">{info.row.index + 1}</span>
                     )}
                  </div>
               )
            },
         }),

         // Column 2: Info (Art + Title + Artist)
         columnHelper.accessor((row) => row.spotify?.title ?? row.yt?.[0].title, {
            id: 'info',
            header: 'Info',
            cell: (info) => {
               const data = info.row.original
               const spotify = data.spotify?.full_response.track
               const yt = data.yt
               const image = spotify?.album.images[0].url ?? yt?.[0].thumbnail_url
               const isPlaying = current?.yt?.[0].id === yt?.[0].id

               const handleNavigateToAI = (e: React.MouseEvent) => {
                  e.stopPropagation() // Зупиняємо спливання, щоб не спрацював row click
                  const title = spotify?.name ?? yt?.[0].title
                  const artist = spotify?.artists[0]?.name ?? yt?.[0].author
                  if (title && artist) {
                     navigate(`/ai?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`)
                  }
               }

               return (
                  <div className="py-1.5 max-w-[300px]">
                     <div className="flex items-center gap-3">
                        {/* Album Art */}
                        <div className="size-10 bg-neutral-800 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative">
                           {image ? (
                              <img src={image} alt="Art" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                 <MusicIcon className="w-5 h-5" />
                              </div>
                           )}
                        </div>

                        {/* Text Info */}
                        <div className="flex flex-col overflow-hidden mr-4">
                           <span
                              onClick={handleNavigateToAI}
                              className={twMerge(
                                 'text-text font-medium hover:underline cursor-pointer truncate text-sm md:text-base',
                                 isPlaying && 'text-lighter'
                              )}
                           >
                              {spotify?.name ?? yt?.[0].title}
                           </span>
                           <span
                              className="text-xs text-text-subtle hover:underline cursor-pointer truncate hover:text-text transition-colors"
                              onClick={(e) => {
                                 e.stopPropagation()
                                 if (!yt || yt.length === 0) return
                              }}
                           >
                              {spotify?.artists.map((a) => a.name).join(', ') ?? yt?.[0].author}
                           </span>
                        </div>
                     </div>
                  </div>
               )
            },
         }),

         // Column 3: Date Added
         columnHelper.accessor((row) => row.spotify?.full_response.added_at ?? row.yt?.[0].published_at, {
            id: 'added',
            header: 'Added',
            cell: (info) => (
               <div
                  className={twMerge(
                     'px-1 text-xs text-text-subtle whitespace-nowrap hidden md:block',
                     !info.row.original.spotify && 'text-red-400'
                  )}
               >
                  {formatRelativeTime(info.getValue() ?? new Date())}
               </div>
            ),
         }),

         // Column 4: Duration
         columnHelper.accessor((row) => row.yt?.[0].duration_ms, {
            id: 'duration',
            header: 'Duration',
            cell: (info) => (
               <div className="px-0.5 text-sm text-text-subtle font-variant-numeric tabular-nums text-center">
                  {formatDuration(info.getValue() ? info.getValue()! / 1000 : 0)}
               </div>
            ),
         }),

         // Column 5: Tags
         columnHelper.accessor((row) => row.yt?.[0]?.lastFm?.artist?.tags.tag.map((t) => t.name), {
            id: 'tags',
            header: 'Tags',
            filterFn: 'arrIncludesAll',
            cell: (info) => {
               const tags = info.row.original.yt?.[0]?.lastFm?.artist?.tags.tag
               const filterValue = info.column.getFilterValue() as string[] | undefined
               return (
                  <div className="px-0.5 text-xs text-text-subtle max-w-[150px] hidden lg:block">
                     <div className="flex flex-wrap gap-1">
                        {Array.isArray(tags) &&
                           tags.map((t) => {
                              const isActive = filterValue?.includes(t.name) ?? false
                              return (
                                 <span
                                    key={t.name}
                                    onClick={(e) => {
                                       e.stopPropagation()
                                       if (isActive) {
                                          // Remove from filter
                                          const newFilter = filterValue?.filter((name) => name !== t.name)
                                          info.column.setFilterValue(newFilter)
                                       } else {
                                          // Add to filter
                                          info.column.setFilterValue([...(filterValue ?? []), t.name])
                                       }
                                    }}
                                    className={twMerge(
                                       'cursor-pointer hover:text-white transition-colors hover:underline',
                                       isActive ? 'text-green-400 font-bold underline' : ''
                                    )}
                                 >
                                    #{t.name}
                                 </span>
                              )
                           })}
                     </div>
                  </div>
               )
            },
         }),
      ],
      [current, navigate] // Залежності: оновлюємо колонки, якщо змінюється поточний трек
   )

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

   // useEffect(
   //    () => setTracks(table.getFilteredRowModel().rows.map((row) => row.original)),
   //    [setTracks, table.getFilteredRowModel().rows]
   // )
   return (
      <table className="w-full text-left border-collapse">
         <thead>
            {table.getHeaderGroups().map((headerGroup) => (
               <tr key={headerGroup.id} className="border-b border-white/10 text-text-subtle text-sm">
                  {headerGroup.headers.map((header) => (
                     <th key={header.id} className="pb-2 font-medium" onClick={header.column.getToggleSortingHandler()}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                           asc: ' 🔼',
                           desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                     </th>
                  ))}
               </tr>
            ))}
         </thead>
         <tbody>
            {table.getRowModel().rows.map((row) => {
               const isPlaying = current?.yt?.[0].id === row.original.yt?.[0].id
               return (
                  <tr
                     key={row.id}
                     className={twMerge(
                        'group border-b border-transparent hover:bg-white/10 transition-colors cursor-default',
                        isPlaying && 'bg-white/10'
                     )}
                     onDoubleClick={() => play({ track: row.original })}
                  >
                     {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                     ))}
                  </tr>
               )
            })}
         </tbody>
      </table>
   )
}
