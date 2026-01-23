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
      const { adapter, addToHistory, addYtVideoToTrack } = get()
      if (!adapter) return toast.warn('⚠️ Player not ready')

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

         adapter.loadVideo(videoId)
         // adapter.play()
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
      const { adapter } = get()
      if (!adapter) return console.warn('⚠️ Player not ready')
      vanillaTrpc.discord.clear.mutate()
      adapter.pause()
      set({ isPlaying: false })
   },

   toggle: () => {
      const { adapter, isPlaying, current } = get()
      if (!adapter) return console.warn('⚠️ Player not ready')
      // const state = playerRef.getPlayerState()
      if (isPlaying) {
         adapter.pause()
         vanillaTrpc.discord.clear.mutate()
         set({ isPlaying: false })
      } else {
         adapter.play()
         if (current) vanillaTrpc.discord.updatePresence.mutate(current)
         set({ isPlaying: true })
      }
   },
})
