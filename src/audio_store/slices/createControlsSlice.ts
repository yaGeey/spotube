import { StateCreator } from 'zustand'
import { AudioStore, PlayerSlice } from '../types'
import { toast } from 'react-toastify'
import { vanillaTrpc } from '@/src/utils/trpc'
import { YoutubeVideo } from '@/generated/prisma/client'

export const createControlsSlice: StateCreator<AudioStore, [], [], PlayerSlice> = (set, get) => ({
   playerRef: null,
   isPlaying: false,
   playlistId: undefined,
   isVisible: true,
   updateState: (state) => set((p) => ({ ...p, ...state })),

   play: async ({ track, forceVideoId, skipHistory, addToDb = true }) => {
      const { adapter, addToHistory, addYtToTrackInPlaylistQuery, addYtToTrackInStore } = get()
      if (!adapter) return toast.warn('⚠️ Player not ready')

      let videoId = forceVideoId ?? track.defaultYtVideoId ?? track.yt?.[0]?.id
      let yt: YoutubeVideo[] = track.yt

      // if no yt - add
      if (!track.yt || !track.yt[0]) {
         set({ isYtLoading: true })
         console.warn('No youtube video provided. Fetching...')
         const q = `${track.artists.map((a) => a.name).join(', ')} - ${track.title}`
         if (addToDb && typeof track.id === 'number') {
            // from local db playlist
            yt = await vanillaTrpc.yt.upsertVideosToMasterFromSpotify.mutate({ q, masterId: track.id })
         } else {
            // from non-db playlist (e.g. spotify playlist play)
            yt = await vanillaTrpc.yt.searchVideos.query(q)
         }
         if (!yt || !yt.length) return toast.error('❌ No videos found')
         for (const video of yt) {
            if (addToDb && typeof track.id === 'number') addYtToTrackInPlaylistQuery({ trackId: track.id, ytPayload: video })
            addYtToTrackInStore({ trackId: track.id, ytPayload: video })
         }
         videoId = yt[0].id

         set({ isYtLoading: false })
      }

      try {
         vanillaTrpc.discord.playingTrack.mutate(track)

         adapter.loadVideo(videoId)
         // adapter.play()
         if (!skipHistory) {
            addToHistory(track)
         }
         set({ current: { ...track, yt }, isPlaying: true })
         console.log(get().tracks, get().current)
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
         if (current) vanillaTrpc.discord.playingTrack.mutate(current)
         set({ isPlaying: true })
      }
   },
})
