import React, { useMemo } from 'react'
import {createColumnHelper
} from '@tanstack/react-table'
import { twMerge } from 'tailwind-merge'
import { formatDuration, formatRelativeTime } from '../../utils/time'
import { PlaylistItemWithRelations, PlaylistWithItems } from '@/electron/lib/prisma'
import { getUserLanguageScript } from '../../utils/userLanguageScript'
import TagsCell from './TagsCell'
import InfoCell from './InfoCell'
import { TableFiltersContext } from './TableContext'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import StatusCell from './StatusCell'
import { faClock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fromDBToCurrent } from '@/src/utils/currentTrackAdapters'
import BaseVirtualTable from './BaseVirtualTable'

const GRID_TEMPLATE = '50px minmax(300px, 1fr) 120px 80px 200px'
const columnHelper = createColumnHelper<PlaylistItemWithRelations>()

export default function SingleCachedPlaylistTable({ playlist }: { playlist: PlaylistWithItems }) {
   const utils = trpc.useUtils()
   const deleteSpotifyTracks = trpc.spotifyUser.deleteTracksFromPlaylist.useMutation({
      onSuccess: () => utils.playlists.getById.invalidate(playlist.id),
   })

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
      [userScripts],
   )

   // context menu
   const plQuery = trpc.spotify.getPlaylists.useQuery()
   const getContextMenuItems = React.useCallback(
      (t: PlaylistItemWithRelations) => {
         return [
            {
               name: 'Open in Spotify',
               function: () => vanillaTrpc.system.openExternalLink.mutate(`https://open.spotify.com/track/${t.id}`),
            },
            // TODO currently only for spotify tracks in single playlist to single spotify, not for combined
            ...(plQuery.data && t.track.spotify
               ? [
                    {
                       name: 'Add to playlist',
                       items: plQuery.data
                          .filter((pl) => playlist.id !== pl.id && pl.origin === 'SPOTIFY')
                          .map((pl) => ({
                             name: pl.title,
                             function: () =>
                                vanillaTrpc.spotifyUser.addTracksToPlaylist.mutate({
                                   playlistId: pl.spotifyMetadataId!,
                                   trackUris: [`spotify:track:${t.track.spotify?.id}`],
                                }),
                          })),
                    },
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
         ]
      },
      [plQuery.data, playlist, deleteSpotifyTracks],
   )

   return (
      <BaseVirtualTable<PlaylistItemWithRelations>
         data={playlist.playlistItems}
         columns={columns}
         gridTemplate={GRID_TEMPLATE}
         getRowId={(row) => row.track.id}
         trackAdapterFn={fromDBToCurrent}
         getContextMenuItems={getContextMenuItems}
         FilterContextProvider={TableFiltersContext.Provider}
      />
   )
}
