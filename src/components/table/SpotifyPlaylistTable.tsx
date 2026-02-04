import { useCallback, useMemo } from 'react'
import BaseVirtualTable from './BaseVirtualTable'
import { createColumnHelper } from '@tanstack/react-table'
import { SpotifyPlaylistItem, SpotifyPlaylistWithItems } from '@/src/types/types'
import { fromSpotifyToCurrent } from '@/src/utils/currentTrackAdapters'
import StatusCell from './StatusCell'
import InfoCellSpotify from '../spotifyTable/InfoCellSpotify'
import { formatDuration, formatRelativeTime } from '@/src/utils/time'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import { addFromSpotifyToPlaylistMenuItem } from '@/src/lib/contextMenuItems'
import { TableSpotifyFilterContext } from '../spotifyTable/TableSpotifyContext'
const GRID_TEMPLATE = '50px minmax(300px, 1fr) 120px 80px 200px'
const columnHelper = createColumnHelper<SpotifyPlaylistItem>()

export default function SpotifyPlaylistTable({ playlist }: { playlist: SpotifyPlaylistWithItems }) {
   const columns = useMemo(
      () => [
         // Column 1: Index / Playing State
         columnHelper.accessor((row, index) => index, {
            id: 'index',
            header: '#',
            cell: (info) => <StatusCell trackId={info.row.original.track.id} posIdx={info.getValue()} />,
         }),

         // Column 2: Info
         columnHelper.accessor((row) => row.track.artists.flatMap((a) => [a.name].filter(Boolean)), {
            id: 'info',
            header: 'Info',
            size: 350,
            filterFn: 'arrIncludesSome',
            cell: (info) => <InfoCellSpotify track={info.row.original.track} setFilterValue={info.column.setFilterValue} />,
         }),

         // Column 3: Date Added
         columnHelper.accessor((row) => row.added_at, {
            id: 'added',
            header: 'Added',
            size: 150,
            cell: (info) => (
               <div className="px-1 text-xs text-text-subtle whitespace-nowrap hidden md:block">
                  {formatRelativeTime(info.getValue() ?? new Date())}
               </div>
            ),
         }),

         // Column 4: Duration
         // TODO change default yt video
         columnHelper.accessor(
            (row) => {
               const spotifyDurationMs = row.track.duration_ms
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

         // TODO tags
      ],
      [],
   )

   const plQuery = trpc.spotify.getPlaylists.useQuery()
   const getContextMenuItems = useCallback(
      (item: SpotifyPlaylistItem) => [
         ...(plQuery.data
            ? [
                 addFromSpotifyToPlaylistMenuItem({
                    currentPlId: playlist.id,
                    trackId: item.track.id,
                    plQueryData: plQuery.data,
                 }),
              ]
            : []),
      ],
      [plQuery.data, playlist.id],
   )
   return (
      <BaseVirtualTable<SpotifyPlaylistItem>
         gridTemplate={GRID_TEMPLATE}
         columns={columns}
         data={playlist.items}
         getRowId={(row) => row.track.id}
         trackAdapterFn={fromSpotifyToCurrent}
         getContextMenuItems={getContextMenuItems}
         FilterContextProvider={TableSpotifyFilterContext}
      />
   )
}
