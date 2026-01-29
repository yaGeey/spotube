import { StateCreator } from 'zustand'
import { AudioStore, PlayerSlice } from '../types'
import ShakaAdapter from '@/src/player/ShakaAdapter'
import BasePlayerAdapter from '@/src/player/BasePlayerAdapter'
import IFrameAdapter from '@/src/player/IFrameAdapter'
import { getStorageValue } from '@/utils/sessionStorage'

export const createPlayerSlice: StateCreator<AudioStore, [], [], PlayerSlice> = (set, get) => ({
   adapter: null,
   // mode: getStorageValue('player-mode', 'iframe') as 'shaka' | 'iframe',
   mode: 'shaka',

   videoElement: null,
   shakaPlayer: null,
   playerRef: null,
   shakaContainer: null,
   bgContainer: null,
   absoluteContainer: null,

   currentTime: 0,
   duration: 0,
   volume: getStorageValue('player-volume', 25) as number,
   isMuted: getStorageValue('player-muted', false) as boolean,
   isVisible: true,
   isPip: false,

   initAdapter: async () => {
      const { adapter: oldAdapter, videoElement, shakaPlayer, playerRef, mode } = get()
      if (oldAdapter) {
         // oldAdapter.pause()
         oldAdapter.dispose()
         // TODO seekTo current time on new adapter
         set({ current: null })
      }

      let adapter: BasePlayerAdapter | null = null
      if (mode === 'shaka') {
         if (!videoElement || !shakaPlayer)
            return console.error('Cannot initialize Shaka Adapter: videoElement or shakaPlayer is null')
         adapter = await ShakaAdapter.create(videoElement, shakaPlayer)
      } else if (mode === 'iframe') {
         if (!playerRef) return console.error('Cannot initialize IFrame Adapter: playerRef is null')
         adapter = new IFrameAdapter(playerRef)
      }

      if (adapter) {
         const { volume, isMuted } = get()
         adapter.setVolume(volume)
         adapter.setMuted(isMuted)
         set({ mode, adapter })
      }
   },

   setMode: (mode: 'shaka' | 'iframe') => {
      localStorage.setItem('player-mode', mode)
      set({ mode })
   },

   seekTo: (time: number) => {
      const { adapter } = get()
      if (!adapter) return console.warn('⚠️ adapter not ready')
      adapter.seekTo(time)

      set({ currentTime: time })
   },

   /* input: 0 <= volume <= 100 */
   setVolume: (volume: number) => {
      const { adapter } = get()
      if (!adapter) return console.warn('⚠️ adapter not ready')
      adapter.setVolume(volume)

      localStorage.setItem('player-volume', volume.toString())
      set({ volume })
   },

   setMuted: (muted: boolean) => {
      const { adapter } = get()
      if (!adapter) return console.warn('⚠️ adapter not ready')
      adapter.setMuted(muted)

      localStorage.setItem('player-muted', muted ? '1' : '0')
      set({ isMuted: muted })
   },
})
