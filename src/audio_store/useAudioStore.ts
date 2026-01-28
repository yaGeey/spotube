import { create } from 'zustand'
import { AudioStore } from './types'
import { createHistorySlice } from './slices/createHistorySlice'
import { createControlsSlice } from './slices/createControlsSlice'
import { createTrackSlice } from './slices/createTracksSlice'
import { createPlayerSlice } from './slices/createPlayerSlice'

export const useAudioStore = create<AudioStore>((...a) => ({
   ...createHistorySlice(...a),
   ...createControlsSlice(...a),
   ...createTrackSlice(...a),
   ...createPlayerSlice(...a),
}))
