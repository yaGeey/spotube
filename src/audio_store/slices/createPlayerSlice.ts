import { StateCreator } from 'zustand'
import { AudioStore, PlayerSlice } from '../types'
import { toast } from 'react-toastify'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import { queryClient } from '@/src/main'
import { create } from 'mutative'
import { PlaylistWithItems, TrackWithRelations } from '@/electron/lib/prisma'

export const createPlayerSlice: StateCreator<AudioStore, [], [], PlayerSlice> = (set, get) => ({
   playerRef: null,
   isPlaying: false,
   setPlayerRef: (ref) => {
      ref.hideVideoInfo()
      set({ playerRef: ref })
   },
   setIsPlaying: (isPlaying) => set({ isPlaying }),
   playlistId: undefined,
   setPlaylistId: (playlistId) => set({ playlistId }),

   play: async ({ track, forceVideoId, skipHistory }) => {
      const { playerRef, addToHistory, addYtVideoToTrack, playlistId, isYtLoading } = get()
      if (!playerRef) return console.warn('⚠️ Player not ready')

      let videoId = forceVideoId ?? track.defaultYtVideoId ?? track.yt?.[0]?.id
      let data: TrackWithRelations = track

      // if no yt - add
      if (!track.yt || !track.yt[0]) {
         set({ isYtLoading: true })
         console.warn('No youtube video provided. Fetching...')
         data = (await vanillaTrpc.yt.upsertVideosToMasterFromSpotify.mutate({
            artist: track.artists.map((a) => a.name).join(', '),
            title: track.title,
            masterId: track.id,
         })) as TrackWithRelations
         if (!data || !data.yt.length) return console.error('❌ No videos found')
         for (const video of data.yt) {
            addYtVideoToTrack({ trackId: track.id, ytPayload: video })
         }
         videoId = data.yt[0].id

         // // updateTrackInQuery({ playlistId: playlistId!, masterId: track.id, data })
         // if (!playlistId) return console.warn('⚠️ No playlistId set in store, cannot update track in query')
         // queryClient.setQueryData(queryKey(playlistId), (p: PlaylistWithItems | undefined) => {
         //    if (!p) return p
         //    return create(p, (d) => {
         //       const item = d?.playlistItems.find((i) => i.track.id === track.id)
         //       if (item) item.track = data
         //    })
         // })
         set({ isYtLoading: false })
      }

      try {
         vanillaTrpc.discord.updatePresence.mutate(track)

         playerRef.loadVideoById(videoId)
         playerRef.playVideo()
         if (!skipHistory) {
            addToHistory(track)
         }
         set({ current: { ...track, yt: data.yt }, isPlaying: true })
      } catch (error) {
         console.error('❌ Play error:', error)
         toast.error('Failed to play video')
         set({ isPlaying: false })
      }
   },

   stop: () => {
      const { playerRef } = get()
      if (!playerRef) return console.warn('⚠️ Player not ready')
      vanillaTrpc.discord.clear.mutate()
      playerRef.stopVideo()
      set({ isPlaying: false })
   },

   toggle: () => {
      const { playerRef, isPlaying, current } = get()
      if (!playerRef) return
      // const state = playerRef.getPlayerState()
      if (isPlaying) {
         playerRef.pauseVideo()
         vanillaTrpc.discord.clear.mutate()
         set({ isPlaying: false })
      } else {
         playerRef.playVideo()
         if (current) vanillaTrpc.discord.updatePresence.mutate(current)
         set({ isPlaying: true })
      }
   },
})
