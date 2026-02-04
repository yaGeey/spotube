import { useEffect, useMemo, useRef, useState } from 'react'
import { useAudioStore } from '../audio_store/useAudioStore'
import Button from '../components/Button'
import { trpc, vanillaTrpc } from '../utils/trpc'
import TracksTable from '../components/table/Table'
import { useLocation, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Prisma } from '@/generated/prisma/client'
import { CombinedPlaylistWithContent, playlistWithDeepRelations } from '@/electron/lib/prisma'
import TableDropZone from '../components/table/DropZone'
import DndAddYtContext from '../components/DndAddYtContext'
import VideoSlot from '../components/player/VideoSlot'
import { PlaylistType } from '../components/nav/Playlists'
import { PlaylistViewModel } from '../types/types'
import SingleCachedPlaylistTable from '../components/table/SingleCachedPlaylistTable'
import SpotifyPlaylistTable from '../components/table/SpotifyPlaylistTable'

// const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
// const spotifyPlaylistId = '15aWWKnxSeQ90bLAzklH61'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'
export type CombinedPlaylistForDisplay = CombinedPlaylistWithContent & { type: PlaylistType }

export default function Playlist() {
   const { id } = useParams()
   const playlistId = id ? parseInt(id) : 0
   const location = useLocation()
   const plType = new URLSearchParams(location.search).get('type') as PlaylistType

   const { play, stop, updateState, tracks, mode } = useAudioStore(
      useShallow((state) => ({
         play: state.play,
         stop: state.stop,
         updateState: state.updateState,
         tracks: state.tracks,
         mode: state.mode,
      })),
   )
   useEffect(() => updateState({ playlistId }), [updateState, playlistId])

   // mutations and queries
   const utils = trpc.useUtils()
   const onSuccess = () => {
      utils.playlists.getById.invalidate(playlistId)
      utils.combinedPlaylists.getById.invalidate(playlistId)
   }
   const lastFMMutation = trpc.lastfm.upsertBatchFromMasterTracks.useMutation({ onSuccess })
   const syncSpotifyMutation = trpc.spotify.upsertPlaylistWithTracks.useMutation({ onSuccess })

   const playlistRes = trpc.playlists.getById.useQuery(playlistId, { enabled: plType === 'local' })
   const combinedPlaylistRes = trpc.combinedPlaylists.getById.useQuery(playlistId, { enabled: plType === 'combined' })

   const pl = useMemo(() => {
      if (plType === 'combined' && combinedPlaylistRes.data) {
         return { data: combinedPlaylistRes.data, type: 'combined' }
      } else if (plType === 'local' && playlistRes.data) {
         return { data: playlistRes.data, type: 'local' }
      }
      return null
   }, [plType, combinedPlaylistRes.data, playlistRes.data]) satisfies PlaylistViewModel | null

   // const combinedPlaylist = useMemo(() => {
   //    if (plType === 'combined' && combinedPlaylistRes.data) {
   //       return { ...combinedPlaylistRes.data, type: 'combined' } satisfies CombinedPlaylistForDisplay
   //    } else if (plType === 'local' && playlistRes.data) {
   //       return {
   //          type: 'local',
   //          id: playlistRes.data.id,
   //          thumbnailUrl: playlistRes.data.thumbnailUrl ?? null,
   //          title: playlistRes.data.title,
   //          description: playlistRes.data.description ?? null,
   //          updatedAt: playlistRes.data.updatedAt ? new Date(playlistRes.data.updatedAt) : new Date(),
   //          createdAt: playlistRes.data.createdAt ? new Date(playlistRes.data.createdAt) : new Date(),
   //          playlists: playlistRes.data ? [playlistRes.data] : [],
   //       } satisfies CombinedPlaylistForDisplay
   //    } else {
   //       // loading
   //       return null
   //    }
   // }, [plType, combinedPlaylistRes.data, playlistRes.data])

   // discord rpc
   // useEffect(() => {
   //    if (!combinedPlaylist) return
   //    vanillaTrpc.discord.lookingAtPlaylist.mutate(combinedPlaylist.playlists[0])
   // }, [combinedPlaylist])

   // separate playlists by origin
   // TODO we are not handling online playlists, because need to rewrite sync logic first
   const spotifyPlaylists = useMemo(
      () =>
         pl?.type === 'combined'
            ? pl.data.playlists.filter((pl) => pl.origin === 'SPOTIFY')
            : pl?.type === 'local'
              ? [pl?.data]
              : [],
      [pl],
   )
   // const ytPlaylists = useMemo(
   //    () => combinedPlaylist?.playlists.filter((pl) => pl.origin === 'YOUTUBE') || [],
   //    [combinedPlaylist],
   // )
   // const localPlaylists = useMemo(
   //    () => combinedPlaylist?.playlists.filter((pl) => pl.origin === 'LOCAL') || [],
   //    [combinedPlaylist],
   // )

   // const isSingle = combinedPlaylist?.playlists.length === 1
   // const isYt = isSingle && combinedPlaylist.playlists[0].origin === 'YOUTUBE'
   // const isSpotify = isSingle && combinedPlaylist.playlists[0].origin === 'SPOTIFY'
   // const isLocal = isSingle && combinedPlaylist.playlists[0].origin === 'LOCAL'

   // check for spotify playlist updates
   const snapshotQueries = trpc.useQueries((t) =>
      spotifyPlaylists.map((pl) =>
         t.spotify.getSnapshotId(pl.spotifyMetadataId!, {
            enabled: Boolean(pl.spotifyMetadataId),
            refetchOnWindowFocus: true,
            refetchInterval: 1000 * 60,
         }),
      ),
   )
   useEffect(() => {
      snapshotQueries.forEach((q) => q.refetch())
   }, [playlistId])

   const checkedPlaylists = useRef<Set<number>>(new Set())
   useEffect(() => {
      if (!spotifyPlaylists.length) return
      spotifyPlaylists.forEach((pl, i) => {
         if (snapshotQueries[i].data && pl.spotifyMetadata?.snapshotId !== snapshotQueries[i].data) {
            // TODO chefk for each playlist instead of global mutation check
            if (!syncSpotifyMutation.isPending && !checkedPlaylists.current.has(pl.id)) {
               syncSpotifyMutation.mutate(pl.spotifyMetadataId!)
               checkedPlaylists.current.add(pl.id)
            }
         }
      })
      checkedPlaylists.current.clear()
   }, [spotifyPlaylists, snapshotQueries.map((q) => q.data).join(',')])

   // last fm sync
   // useEffect(() => {
   //    if (items.length > 0) {
   //       lastFMMutation.mutate(items.map((item) => item.track))
   //    }
   // }, [items, lastFMMutation])

   if (!pl) return <div>Loading...</div>
   return (
      <DndAddYtContext plId={playlistId} enabled={pl.type === 'local'}>
         <div>
            <div className="flex gap-2">
               <Button onClick={() => play({ track: tracks[Math.round(Math.random() * tracks.length - 1)] })}>PLAY random</Button>
               <Button onClick={() => stop()}>STOP</Button>
               <Button
                  onClick={() => {
                     useAudioStore.setState((p) => ({ isVisible: !p.isVisible }))
                  }}
               >
                  toggle player
               </Button>
               <Button onClick={(e) => useAudioStore.setState((p) => ({ isPip: !p.isPip }))}>PIP</Button>
               <Button
                  onClick={() => {
                     // setIsFullScreen((p) => !p)
                     // playerRef.current.setSize(window.innerWidth, window.innerHeight)
                     useAudioStore.getState().playerRef.current.getIframe().requestFullscreen()
                  }}
               >
                  fullscreen
               </Button>
               {/* <Button
                  onClick={async () => {
                     const data = await lastFMMutation.mutateAsync(
                        (combinedPlaylist?.playlists.flatMap((pl) => pl.playlistItems) || []).map((item) => item.track),
                     )
                     if (data) alert('LastFM data upserted. Reload the page')
                  }}
               >
                  LastFM
               </Button> */}
               <Button
                  onClick={() => {
                     if (mode === 'shaka') updateState({ mode: 'iframe' })
                     else updateState({ mode: 'shaka' })
                  }}
               >
                  change to {mode === 'shaka' ? 'iframe' : 'shaka'}
               </Button>
            </div>
         </div>
         <VideoSlot />
         {pl.type === 'local' && (
            <TableDropZone>
               <SingleCachedPlaylistTable playlist={pl.data} />
            </TableDropZone>
         )}
         {pl.type === 'combined' && <span>Implement for {pl.type}!</span>}
      </DndAddYtContext>
   )
}
