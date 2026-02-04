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
import { formatDuration, formatRelativeTime } from '../../utils/time'
import { PlaylistItemWithRelations, PlaylistWithItems } from '@/electron/lib/prisma'
import { getUserLanguageScript } from '../../utils/userLanguageScript'
import { useVirtualizer } from '@tanstack/react-virtual'
import TagsCell from './TagsCell'
import InfoCell from './InfoCell'
import { TableFiltersContext } from './TableContext'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import StatusCell from './StatusCell'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fromDBToCurrent } from '@/src/utils/currentTrackAdapters'
import useContextMenu from '@/src/hooks/useContextMenu'
import ContextMenu, { ContextMenuItem } from '../ContextMenu'
import { addFromSpotifyToPlaylistMenuItem } from '@/src/lib/contextMenuItems'
const GRID_TEMPLATE = '50px minmax(300px, 1fr) 120px 80px 200px'

const columnHelper = createColumnHelper<PlaylistItemWithRelations>()

export default function TracksTable({ playlist }: { playlist: PlaylistWithItems }) {
   const play = useAudioStore((state) => state.play)
   const current = useAudioStore((state) => state.current)
   const setTracks = useAudioStore((state) => state.setTracks)
   const isYtLoading = useAudioStore((state) => state.isYtLoading)

   const utils = trpc.useUtils()
   const deleteSpotifyTracks = trpc.spotifyUser.deleteTracksFromPlaylist.useMutation({
      onSuccess: () => {
         utils.playlists.getById.invalidate(playlist.id)
         // if (type === 'local') utils.playlists.getById.invalidate(pla.id)
         // else utils.combinedPlaylists.getById.invalidate(combPl.id)
      },
   })

   const [sorting, setSorting] = useState<SortingState>([])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
   const userScripts = getUserLanguageScript()

   const columns = useMemo(
      () => [
         // Column 1: Index / Playing State
         // TODO position
         columnHelper.accessor((row) => row.position, {
            id: 'index',
            header: '#',
            cell: (info) => <StatusCell trackId={info.row.original.trackId} posIdx={info.getValue()} />,
         }),

         // Column 2: Info (Art + Title + Artist)
         columnHelper.accessor(
            (row) => row.track?.artists.flatMap((a) => [a.name, a.latinName].filter(Boolean)) ?? [row.track.yt?.[0].author],
            {
               id: 'info',
               header: 'Info',
               size: 350,
               filterFn: 'arrIncludesSome',
               cell: (info) => <InfoCell userScripts={userScripts} info={info} />,
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
               header: () => <FontAwesomeIcon icon={faClock} />,
               size: 100,
               cell: (info) => (
                  <div className="px-0.5 text-sm text-text-subtle font-variant-numeric tabular-nums text-center">
                     {formatDuration(info.getValue() ? info.getValue() : 0)}
                  </div>
               ),
            },
         ),

         // Column 5: Tags
         columnHelper.accessor(
            (row) => {
               const albumTags = row.track.lastFM?.album?.tags?.tag
               const trackTags = row.track.lastFM?.track?.toptags?.tag
               const artistTags = row.track.artists.flatMap((a) => {
                  const tags = a.lastFM?.tags?.tag
                  if (!tags) return []
                  return Array.isArray(tags) ? tags.map((t) => t.name) : [(tags as any).name]
               })

               const allTags = [
                  ...(albumTags ? (Array.isArray(albumTags) ? albumTags.map((t) => t.name) : [(albumTags as any).name]) : []),
                  ...(trackTags ? (Array.isArray(trackTags) ? trackTags.map((t) => t.name) : [(trackTags as any).name]) : []),
                  ...artistTags,
               ]

               return Array.from(new Set(allTags))
            },
            {
               id: 'tags',
               header: 'Tags',
               size: 200,
               filterFn: 'arrIncludesAll',
               cell: (info) => <TagsCell info={info} />,
            },
         ),
      ],
      [current, userScripts],
   )

   const parentRef = useRef<HTMLDivElement>(null)
   const table = useReactTable({
      data: playlist.playlistItems,
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
      const newRows = table.getFilteredRowModel().rows.map((row) => row.original.track)
      const currentTracks = useAudioStore.getState().tracks

      // Порівнюємо рядки як текст.
      const adapted = newRows.map((track) => fromDBToCurrent(track))
      if (JSON.stringify(adapted) !== JSON.stringify(currentTracks)) {
         console.log('🔄 Updating tracks from table filter...')
         setTracks(adapted)
      }
   }, [setTracks, table.getFilteredRowModel().rows])

   // context menu
   const { handleContextMenu, left, top, isOpen } = useContextMenu()
   const [menuItems, setMenuItems] = React.useState<ContextMenuItem[]>([])
   const plQuery = trpc.spotify.getPlaylists.useQuery()
   const getContextMenuItems = React.useCallback(
      (t: PlaylistItemWithRelations) => {
         setMenuItems([
            {
               name: 'Open in Spotify',
               function: () => vanillaTrpc.system.openExternalLink.mutate(`https://open.spotify.com/track/${t.id}`),
            },
            // TODO currently only for spotify tracks in single playlist to single spotify, not for combined
            ...(plQuery.data && t.track.spotify
               ? [
                    addFromSpotifyToPlaylistMenuItem({
                       currentPlId: playlist.id,
                       trackId: t.track.spotify.id,
                       plQueryData: plQuery.data,
                    }),
                 ]
               : []),
            // TODO currently if playlist is single and from spotify
            ...(t.track.spotify && playlist.origin === 'SPOTIFY'
               ? [
                    {
                       name: 'Delete from Spotify Library',
                       function: () =>
                          deleteSpotifyTracks.mutate({
                             playlistId: playlist.spotifyMetadataId!,
                             tracksUris: [`spotify:track:${t.track.spotify?.id}`],
                          }),
                    },
                 ]
               : []),
         ])
      },
      [plQuery.data, playlist, deleteSpotifyTracks],
   )

   return (
      <TableFiltersContext.Provider value={columnFilters}>
         {isOpen && <ContextMenu left={left} top={top} items={menuItems} />}
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
                        getContextMenuItems={getContextMenuItems}
                        handleContextMenu={handleContextMenu}
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
      getContextMenuItems,
      handleContextMenu,
   }: {
      row: Row<PlaylistItemWithRelations>
      virtualRow: any
      play: (track: any) => void
      index: number
      isYtLoading: boolean
      getContextMenuItems: (t: PlaylistItemWithRelations) => void
      handleContextMenu: (e: React.MouseEvent, t: PlaylistItemWithRelations) => void
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
            onDoubleClick={() => play({ track: fromDBToCurrent(row.original.track) })}
            onContextMenu={(e) => {
               getContextMenuItems(row.original)
               handleContextMenu(e, row.original)
            }}
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
