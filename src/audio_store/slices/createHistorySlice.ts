import { StateCreator } from 'zustand'
import { AudioStore, HistorySlice } from '../types'
import { toast } from 'react-toastify'
import { TrackWithRelations } from '@/electron/lib/prisma'
import { ViewTrackModel } from '@/src/utils/currentTrackAdapters'

export const createHistorySlice: StateCreator<AudioStore, [], [], HistorySlice> = (set, get) => ({
   history: [],
   currentIndexAtHistory: -1,
   // TODO implement all random types
   randomType: null,

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
      const { history, play, currentIndexAtHistory, tracks, current, randomType } = get()

      // рухаємось по вже існуючій історії (наприклад, користувач натискав "Back")
      const nextIndex = currentIndexAtHistory + 1
      if (nextIndex < history.length) {
         const nextTrack = history[nextIndex]
         set({ currentIndexAtHistory: nextIndex })
         play({ track: nextTrack, skipHistory: true }) // skipHistory = true
         return
      }

      // Ми в кінці історії, треба обрати НОВИЙ трек
      let newTrack: ViewTrackModel | null = null
      const currentInListId = tracks.findIndex((t) => t.id === current?.id)

      if (randomType === 'true') {
         // true random. check to not repeat the same track
         let newId = null
         do {
            newId = Math.floor(Math.random() * tracks.length)
         } while (tracks.length > 1 && tracks[newId].id === current?.id)
         newTrack = tracks[newId]
      } else if (randomType === null) {
         // Перевіряємо, чи є наступний трек. Якщо ні - newTrack залишиться null
         if (currentInListId !== -1 && currentInListId < tracks.length - 1) {
            newTrack = tracks[currentInListId + 1]
         }
      }
      // Якщо плейлист закінчився і треку немає - нічого не робимо або зупиняємо
      if (!newTrack) return toast.info('End of playlist reached')

      play({ track: newTrack })
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
})
