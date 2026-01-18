import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { formatDuration, formatRelativeTime } from '../utils/time'
import { MusicIcon } from './Icons'
import AnimatedEqualizer from './icons/AnimatedEqualizer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { PlaylistItemWithRelations, PlaylistWithItems, TrackWithRelations } from '@/electron/lib/prisma'
import { getUserLanguageScript } from '../utils/userLanguageScript'
import { trpc } from '../utils/trpc'
import { useVirtualizer } from '@tanstack/react-virtual'

// Створюємо хелпер для типізації колонок
const columnHelper = createColumnHelper<PlaylistItemWithRelations>()

export default function TracksTable({ data, playlistId }: { data: PlaylistItemWithRelations[]; playlistId: number }) {
   const { play, current, setTracks, addYtVideoToTrack, isYtLoading } = useAudioStore()
   const navigate = useNavigate()
   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
   const upsertVideoMutation = trpc.yt.upsertVideosToMasterFromSpotify.useMutation()
   const userScripts = getUserLanguageScript()

   // Визначаємо колонки
   const columns = useMemo(
      () => [
         // Column 1: Index / Playing State
         columnHelper.display({
            id: 'index',
            header: '#',
            cell: (info) => {
               const isPlaying = !!(current?.yt?.[0]?.id && current.yt[0].id === info.row.original.track.yt?.[0]?.id)

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
         columnHelper.accessor(
            (row) => row.track?.artistsLatin?.split(', ') ?? row.track?.artists.split(', ') ?? [row.track.yt?.[0].author],
            {
               id: 'info',
               header: 'Info',
               size: 350,
               filterFn: 'arrIncludesSome',
               cell: (info) => {
                  const t = info.row.original.track
                  const { spotify, yt } = t
                  const isPlaying = !!(current?.yt?.[0]?.id && current.yt[0].id === yt?.[0]?.id)

                  const filterValue = info.column.getFilterValue() as string[] | undefined
                  const handleNavigateToAI = (e: React.MouseEvent) => {
                     e.stopPropagation() // Зупиняємо спливання, щоб не спрацював row click
                     if (t.title && t.artists) {
                        navigate(
                           `/ai?artist=${encodeURIComponent(t.artists.split(', ')[0])}&title=${encodeURIComponent(t.title)}`,
                        )
                     }
                  }

                  return (
                     <div className="py-1.5 max-w-[350px]">
                        <div className="flex items-center gap-3">
                           {/* Album Art */}
                           <div className="size-10 bg-neutral-800 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative">
                              {t.thumbnailUrl ? (
                                 <img
                                    src={t.thumbnailUrl}
                                    alt="Art"
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transform-gpu"
                                 />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                    <MusicIcon className="w-5 h-5" />
                                 </div>
                              )}
                           </div>

                           {/* Text Info */}
                           <div className="flex flex-col overflow-hidden mr-4">
                              <span
                                 // onClick={handleNavigateToAI}
                                 className={twMerge(
                                    'text-text font-medium hover:underline cursor-pointer truncate text-sm md:text-base',
                                    isPlaying && 'text-lighter',
                                 )}
                              >
                                 <span
                                    className={t.titleLatin && !userScripts.includes(t.script ?? '') ? 'group-hover:hidden' : ''}
                                 >
                                    {t.title}
                                 </span>
                                 {t.titleLatin && !userScripts.includes(t.script ?? '') && (
                                    <span className="hidden group-hover:inline">{t.titleLatin}</span>
                                 )}
                                 <InfoIcon data={t.lastFM?.track?.wiki?.content} />
                              </span>

                              <div
                                 className="text-xs text-text-subtle cursor-pointer truncate transition-colors"
                                 onClick={(e) => {
                                    e.stopPropagation()
                                    if (!yt || yt.length === 0) return
                                 }}
                              >
                                 {/* TODO lastfm for each artist, noy only first */}
                                 {t.artists?.split(', ').map((a, index) => {
                                    const artistLatin = t.artistsLatin?.split(', ')[index] || a
                                    const isActive = filterValue?.includes(artistLatin) ?? false
                                    return (
                                       <span key={artistLatin + index}>
                                          <span
                                             onClick={(e) => {
                                                e.stopPropagation()
                                                console.log(t.script)
                                                if (isActive) {
                                                   const newFilter = filterValue?.filter((p) => p !== artistLatin)
                                                   info.column.setFilterValue(newFilter)
                                                } else {
                                                   info.column.setFilterValue([...(filterValue ?? []), artistLatin])
                                                }
                                             }}
                                             className={twMerge(
                                                'cursor-pointer hover:text-white transition-colors hover:underline',
                                                isActive && 'text-green-400 font-bold underline',
                                             )}
                                          >
                                             <span
                                                className={
                                                   artistLatin && !userScripts.includes(t.script ?? '')
                                                      ? 'group-hover:hidden'
                                                      : ''
                                                }
                                             >
                                                {a}
                                             </span>
                                             {artistLatin && !userScripts.includes(t.script ?? '') && (
                                                <span className="hidden group-hover:inline">{artistLatin}</span>
                                             )}
                                          </span>

                                          {index < t.artists.split(', ').length - 1 && ', '}
                                       </span>
                                    )
                                 })}
                                 <InfoIcon data={t.lastFM?.artist?.bio?.content} />
                                 <InfoIcon data={t.lastFM?.album?.wiki?.content} />
                              </div>
                           </div>
                        </div>
                     </div>
                  )
               },
            },
         ),

         // Column 3: Date Added
         columnHelper.accessor((row) => row.addedAt, {
            id: 'added',
            header: 'Added',
            size: 150,
            cell: (info) => (
               <div
                  className={twMerge(
                     'px-1 text-xs text-text-subtle whitespace-nowrap hidden md:block',
                     !info.row.original.track.spotify && 'text-red-400',
                  )}
               >
                  {formatRelativeTime(info.getValue() ?? new Date())}
               </div>
            ),
         }),

         // Column 4: Duration
         // TODO change default yt video
         columnHelper.accessor(
            (row) => {
               const ytDuration = row.track.yt?.[0]?.duration
               if (ytDuration) return ytDuration

               const spotifyDurationMs = row.track.spotify?.fullResponse.duration_ms
               if (spotifyDurationMs) return Math.floor(spotifyDurationMs / 1000)

               return 0
            },
            {
               id: 'duration',
               header: 'Duration',
               size: 100,
               cell: (info) => (
                  <div className="px-0.5 text-sm text-text-subtle font-variant-numeric tabular-nums text-center">
                     {formatDuration(info.getValue() ? info.getValue() : 0)}
                  </div>
               ),
            },
         ),

         // Column 5: Tags
         columnHelper.accessor((row) => row.track.lastFM?.artist?.tags.tag.map((t) => t.name), {
            id: 'tags',
            header: 'Tags',
            size: 200,
            filterFn: 'arrIncludesAll',
            cell: (info) => {
               const tags = info.row.original.track.lastFM?.artist?.tags.tag
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
                                       isActive ? 'text-green-400 font-bold underline' : '',
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
      [current, navigate, userScripts],
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
      const newRows = table.getFilteredRowModel().rows.map((row) => row.original.track)

      // Отримуємо поточні треки зі стору (через getState, щоб не створювати зайвих підписок,
      const currentTracks = useAudioStore.getState().tracks

      // Порівнюємо рядки як текст.
      if (JSON.stringify(newRows) !== JSON.stringify(currentTracks)) {
         console.log('🔄 Updating tracks from table filter...')
         setTracks(newRows)
      }
   }, [setTracks, table.getFilteredRowModel().rows])

   return (
      <div ref={parentRef} className="h-[calc(100dvh-200px)] overflow-auto w-full relative">
         <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
            <table className="w-full text-left border-collapse _table-fixed">
               <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                     <tr key={headerGroup.id} className="border-b border-white/10 text-text-subtle text-sm">
                        {headerGroup.headers.map((header) => (
                           <th
                              key={header.id}
                              className="pb-2 font-medium"
                              // style={{ width: header.getSize() }}
                              onClick={header.column.getToggleSortingHandler()}
                           >
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
                  {virtualizer.getVirtualItems().map((virtualRow, index) => {
                     const row = rows[virtualRow.index]
                     const isPlaying = !!(current?.yt?.[0]?.id && current.yt[0].id === row.original.track.yt?.[0]?.id)

                     return (
                        <tr
                           key={row.id}
                           className={twMerge(
                              'group border-b border-transparent hover:bg-white/10 transition-colors cursor-default',
                              isPlaying && 'bg-white/10',
                              isYtLoading && 'opacity-50 pointer-events-none',
                           )}
                           style={{
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
                           }}
                           onDoubleClick={() => play({ track: row.original.track })}
                        >
                           {row.getVisibleCells().map((cell) => (
                              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                           ))}
                        </tr>
                     )
                  })}
               </tbody>
            </table>
         </div>
      </div>
   )
}

function InfoIcon({ data }: { data: string | undefined | null }) {
   if (!data) return null
   const cleared = data.split('<a')[0]
   return (
      <FontAwesomeIcon
         className="text-xs text-text-subtle hover:text-white transition-colors ml-1 cursor-pointer"
         icon={faCircleInfo}
         onClick={() => console.log(cleared)}
      />
   )
}
