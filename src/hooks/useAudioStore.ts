import { create } from 'zustand'
import { toast } from 'react-toastify'
import { TrackCombined } from '../types/types'
import { trpc, vanillaTrpc } from '../utils/trpc'

type AudioStore = {
   playerRef: any
   current: TrackCombined | null
   play: ({ track, forceVideoId, skipHistory }: { track: TrackCombined; forceVideoId?: string; skipHistory?: boolean }) => void
   updateDefaultVideo: ({ track, youtubeVideoId }: { track: TrackCombined; youtubeVideoId: string }) => void
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
   addToHistory: (track: TrackCombined) => void
   clearHistory: () => void
   isRandom: boolean
   setIsRandom: (isRandom: boolean) => void
}

export const useAudioStore = create<AudioStore>((set, get) => ({
   playerRef: null,
   current: null,
   isPlaying: false,
   tracks: [],
   history: [],
   currentIndexAtHistory: -1,
   isRandom: false,
   setIsRandom: (isRandom) => set({ isRandom }),
   setPlayerRef: (ref) => {
      ref.hideVideoInfo()
      set({ playerRef: ref })
   },
   setIsPlaying: (isPlaying) => set({ isPlaying }),
   setTracks: (tracks) => set({ tracks }),

   back: () => {
      const { history, play, currentIndexAtHistory } = get()
      const curIndex = currentIndexAtHistory - 1
      if (curIndex < 0) return toast.info('No previously played tracks')
      const prevTrack = history[curIndex]
      console.log('⏮️ Back to:', prevTrack, history, curIndex)
      set({ currentIndexAtHistory: curIndex })
      play({ track: prevTrack, skipHistory: true }) // skipHistory = true
   },

   next: () => {
      const { history, play, currentIndexAtHistory, tracks, current, isRandom } = get()

      // рухаємось по вже існуючій історії (наприклад, користувач натискав "Back")
      const nextIndex = currentIndexAtHistory + 1
      if (nextIndex < history.length) {
         const nextTrack = history[nextIndex]
         set({ currentIndexAtHistory: nextIndex })
         play({ track: nextTrack, skipHistory: true }) // skipHistory = true
         return
      }

      // Ми в кінці історії, треба обрати НОВИЙ трек
      let newTrack: TrackCombined | null = null
      const currentInListId = tracks.findIndex((t) => t.spotify?.id === current?.spotify?.id)
      if (isRandom) {
         // TODO Тут можна додати перевірку, щоб рандом не видав той самий трек, що грає зараз
         const newId = Math.floor(Math.random() * tracks.length)
         newTrack = tracks[newId]
      } else {
         // Перевіряємо, чи є наступний трек. Якщо ні - newTrack залишиться null
         if (currentInListId !== -1 && currentInListId < tracks.length - 1) {
            newTrack = tracks[currentInListId + 1]
         }
      }
      // Якщо плейлист закінчився і треку немає - нічого не робимо або зупиняємо
      if (!newTrack) return

      play({ track: newTrack })
   },

   play: ({ track, forceVideoId, skipHistory }) => {
      const { playerRef, addToHistory } = get()
      if (!playerRef) return console.warn('⚠️ Player not ready')
      if (!track.yt || !track.yt[0]) return console.warn('⚠️ No youtube video provided')

      const videoId = forceVideoId ?? track.spotify?.default_yt_video_id ?? track.yt?.[0].id
      try {
         vanillaTrpc.discord.updatePresence.mutate(track)

         playerRef.loadVideoById(videoId)
         playerRef.playVideo()
         if (!skipHistory) {
            addToHistory(track)
         }
         set({ current: track, isPlaying: true })
      } catch (error) {
         console.error('❌ Play error:', error)
         toast.error('Failed to play video')
         set({ isPlaying: false })
      }
   },

   updateDefaultVideo: ({ track, youtubeVideoId }) => {
      if (!track.yt || !track.yt[0]) return console.warn('⚠️ No youtube video provided')
      const { tracks } = get()
      if (youtubeVideoId && track.yt.length > 1 && track.spotify?.id) {
         // Update default video locally
         // TODO not working, as table not subscribed to store changes
         console.log('Updating default video locally and in DB...')
         const currentInListId = tracks.findIndex((t) => t.spotify?.id === track.spotify?.id)
         const updatedTracks = tracks.map((track, id) => {
            if (id === currentInListId && track.spotify) {
               return {
                  ...track,
                  spotify: {
                     ...track.spotify,
                     default_yt_video_id: youtubeVideoId,
                  },
               }
            }
            return track
         })
         set({ tracks: updatedTracks })

         // Update default video in database
         vanillaTrpc.spotify.updateDefaultVideo.mutate({
            spotifyTrackId: track.spotify.id,
            youtubeVideoId,
         })

         toast.success('Default YouTube video updated')
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

   addToHistory: (track) => {
      const { history, currentIndexAtHistory } = get()
      // Логіка: відрізаємо "майбутнє", якщо ми були в минулому, і додаємо новий трек
      const newHistory = history.slice(0, currentIndexAtHistory + 1)
      newHistory.push(track)
      set({
         history: newHistory,
         currentIndexAtHistory: newHistory.length - 1,
      })
   },
   clearHistory: () => set({ history: [], currentIndexAtHistory: -1 }),
}))
