import { create } from 'zustand'
import { toast } from 'react-toastify'
import { Track, TrackCombined } from '../types/types'

type AudioStore = {
   playerRef: any
   current: TrackCombined | null
   play: (data: TrackCombined) => void
   stop: () => void
   setPlayerRef: (ref: any) => void
   toggle: () => void
   isPlaying: boolean
   setIsPlaying: (isPlaying: boolean) => void
   tracks: TrackCombined[]
   setTracks: (tracks: TrackCombined[]) => void
   history: TrackCombined[]
   currentIndexAtHistory: number
   back: () => void
   next: () => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
   playerRef: null,
   current: null,
   isPlaying: false,
   tracks: [],
   history: [],
   currentIndexAtHistory: -1,

   setPlayerRef: (ref) => set({ playerRef: ref }),
   setIsPlaying: (isPlaying) => set({ isPlaying }),
   setTracks: (tracks) => set({ tracks }),

   back: () => {
      const { history, play, currentIndexAtHistory } = get()
      const curIndex = currentIndexAtHistory - 1
      if (curIndex < 0) return toast.info('No previously played tracks')
      const prevTrack = history[curIndex]
      set({ currentIndexAtHistory: curIndex })
      play(prevTrack)
   },

   next: () => {
      const { history, play, currentIndexAtHistory, tracks } = get()
      const curIndex = currentIndexAtHistory + 1
      if (curIndex === history.length) {
         const random = Math.floor(Math.random() * tracks.length)
         set({ history: [...history, tracks[random]], currentIndexAtHistory: curIndex })
         return play(tracks[random])
      }
      const nextTrack = history[curIndex]
      set({ currentIndexAtHistory: curIndex })
      play(nextTrack)
   },

   play: (data) => {
      const { playerRef } = get()
      if (!playerRef) return console.warn('⚠️ Player not ready')
      if (!data.yt || !data.yt[0]) return console.warn('⚠️ No youtube video provided')

      const videoId = data.yt[0].id
      try {
         window.ipcRenderer.send('update-last-played', videoId) // TODO implement on client
         window.ipcRenderer.send('update-discord-presence', data)

         playerRef.loadVideoById(videoId)
         playerRef.playVideo()
         set({ current: data, isPlaying: true })
      } catch (error) {
         console.error('❌ Play error:', error)
         toast.error('Failed to play video')
         set({ isPlaying: false })
      }
   },

   stop: () => {
      const { playerRef } = get()
      if (!playerRef) return console.warn('⚠️ Player not ready')
      window.ipcRenderer.send('clear-discord-presence')
      playerRef.stopVideo()
      set({ isPlaying: false })
   },

   toggle: () => {
      const { playerRef, isPlaying, current } = get()
      if (!playerRef) return
      // const state = playerRef.getPlayerState()
      if (isPlaying) {
         playerRef.pauseVideo()
         window.ipcRenderer.send('clear-discord-presence')
         set({ isPlaying: false })
      } else {
         playerRef.playVideo()
         window.ipcRenderer.send('update-discord-presence', current)
         set({ isPlaying: true })
      }
   },
}))
