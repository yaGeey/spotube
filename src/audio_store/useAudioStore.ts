import { create } from 'zustand'
import { AudioStore } from './types'
import { createHistorySlice } from './slices/createHistorySlice'
import { createPlayerSlice } from './slices/createPlayerSlice'
import { createTrackSlice } from './slices/createTracksSlice'

export const useAudioStore = create<AudioStore>((...a) => ({
   ...createHistorySlice(...a),
   ...createPlayerSlice(...a),
   ...createTrackSlice(...a),
}))
