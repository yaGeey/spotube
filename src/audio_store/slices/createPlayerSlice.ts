import { StateCreator } from 'zustand'
import { AudioStore, PlayerSlice } from '../types'
import { toast } from 'react-toastify'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import { PlaylistWithItems, TrackWithRelations } from '@/electron/lib/prisma'

export const createPlayerSlice: StateCreator<AudioStore, [], [], PlayerSlice> = (set, get) => ({
   playerRef: null,
   isPlaying: false,
   playlistId: undefined,
   updateState: (state) => set((p) => ({ ...p, ...state })),

   play: async ({ track, forceVideoId, skipHistory }) => {
      const { playerRef, addToHistory, addYtVideoToTrack } = get()
      if (!playerRef) return toast.warn('⚠️ Player not ready')

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
         if (!data || !data.yt.length) return toast.error('❌ No videos found')
         for (const video of data.yt) {
            addYtVideoToTrack({ trackId: track.id, ytPayload: video })
         }
         videoId = data.yt[0].id

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
