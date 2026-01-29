import { useEffect, useMemo, useRef, useState } from 'react'
import { useAudioStore } from '../audio_store/useAudioStore'
import Button from '../components/Button'
import { trpc, vanillaTrpc } from '../utils/trpc'
import TracksTable from '../components/table/Table'
import { useLocation, useParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Prisma } from '@/generated/prisma/client'
import { playlistWithDeepRelations } from '@/electron/lib/prisma'
import TableDropZone from '../components/table/DropZone'
import DndAddYtContext from '../components/DndAddYtContext'
import VideoSlot from '../components/player/VideoSlot'

// const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
// const spotifyPlaylistId = '15aWWKnxSeQ90bLAzklH61'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

type CombinedPlaylistWithContent = Prisma.CombinedPlaylistGetPayload<{
   include: { playlists: { include: typeof playlistWithDeepRelations } }
}>

export default function Playlist() {
   const { id } = useParams()
   const playlistId = id ? parseInt(id) : 0
   const location = useLocation()
   const isCombined = Boolean(new URLSearchParams(location.search).get('combined'))
   const [selectedPanel, setSelectedPanel] = useState<'info' | 'yt'>('yt')

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

   // TODO fetch only one
   const playlistRes = trpc.playlists.getById.useQuery(playlistId)
   const combinedPlaylistRes = trpc.combinedPlaylists.getById.useQuery(playlistId)

   const combinedPlaylist = useMemo(() => {
      if (isCombined && combinedPlaylistRes.data) {
         return combinedPlaylistRes.data satisfies CombinedPlaylistWithContent
      } else if (playlistRes.data) {
         return {
            thumbnailUrl: playlistRes.data.thumbnailUrl ?? null,
            title: playlistRes.data.title,
            description: playlistRes.data.description ?? null,
            updatedAt: playlistRes.data.updatedAt ? new Date(playlistRes.data.updatedAt) : new Date(),
            createdAt: playlistRes.data.createdAt ? new Date(playlistRes.data.createdAt) : new Date(),
            playlists: playlistRes.data ? [playlistRes.data] : [],
         } as Omit<CombinedPlaylistWithContent, 'id'>
      } else {
         // loading
         return null
      }
   }, [isCombined, combinedPlaylistRes.data, playlistRes.data])

   // discord rpc
   useEffect(() => {
      if (!combinedPlaylist) return
      vanillaTrpc.discord.lookingAtPlaylist.mutate(combinedPlaylist.playlists[0])
   }, [combinedPlaylist])

   // separate playlists by origin
   const spotifyPlaylists = useMemo(
      () => combinedPlaylist?.playlists.filter((pl) => pl.origin === 'SPOTIFY') || [],
      [combinedPlaylist],
   )
   const ytPlaylists = useMemo(
      () => combinedPlaylist?.playlists.filter((pl) => pl.origin === 'YOUTUBE') || [],
      [combinedPlaylist],
   )
   const localPlaylists = useMemo(
      () => combinedPlaylist?.playlists.filter((pl) => pl.origin === 'LOCAL') || [],
      [combinedPlaylist],
   )

   const isSingle = combinedPlaylist?.playlists.length === 1
   const isYt = isSingle && combinedPlaylist.playlists[0].origin === 'YOUTUBE'
   const isSpotify = isSingle && combinedPlaylist.playlists[0].origin === 'SPOTIFY'
   const isLocal = isSingle && combinedPlaylist.playlists[0].origin === 'LOCAL'

   // check for spotify playlist updates
   const checkedPlaylistsRef = useRef(new Set<string>())
   useEffect(() => {
      if (!spotifyPlaylists) return
      spotifyPlaylists.forEach((pl) => {
         if (checkedPlaylistsRef.current.has(pl.spotifyMetadataId!)) return
         const lastUpdate = new Date(pl.updatedAt).getTime()
         const isStale = Date.now() - lastUpdate > 60 * 1000
         // 1 minute cache
         if (isStale && !syncSpotifyMutation.isPending) {
            checkedPlaylistsRef.current.add(pl.spotifyMetadataId!)
            syncSpotifyMutation.mutate(pl.spotifyMetadataId!)
         }
      })
   }, [spotifyPlaylists, syncSpotifyMutation])

   const items = useMemo(() => combinedPlaylist?.playlists.flatMap((pl) => pl.playlistItems) || [], [combinedPlaylist])
   // last fm sync
   // useEffect(() => {
   //    if (items.length > 0) {
   //       lastFMMutation.mutate(items.map((item) => item.track))
   //    }
   // }, [items, lastFMMutation])

   if (!combinedPlaylist) return <div>Loading...</div>
   return (
      <DndAddYtContext plId={playlistId} enabled={isLocal}>
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
               <Button
                  onClick={async () => {
                     const data = await lastFMMutation.mutateAsync(items.map((item) => item.track))
                     if (data) alert('LastFM data upserted. Reload the page')
                  }}
               >
                  LastFM
               </Button>
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
         {items && (
            <TableDropZone>
               <TracksTable data={items} playlistId={playlistId} />
            </TableDropZone>
         )}
      </DndAddYtContext>
   )
}
