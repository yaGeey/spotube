// import { TrackWithRelations } from '@/electron/lib/prisma'
import { YoutubeVideo } from '@/generated/prisma/client'
import type shaka from 'shaka-player/dist/shaka-player.ui'
import BasePlayer from '../player/BasePlayerAdapter'
import { ViewTrackModel } from '../utils/currentTrackAdapters'
type RandomType = null | 'true' | 'leastPlayedAllTime' | 'leastPlayedNow'

// videoRef - shaka player video element reference
// playerRef - youtube iframe reference

export interface PlayerSlice {
   playerRef: any | null
   play: ({
      track,
      forceVideoId,
      skipHistory,
      addToDb,
   }: {
      track: ViewTrackModel
      forceVideoId?: string
      skipHistory?: boolean
      addToDb?: boolean
   }) => void
   stop: () => void
   toggle: () => void
   isPlaying: boolean
   playlistId: number | undefined
   updateState: (state: Partial<AudioStore>) => void
   isVisible: boolean
}

export interface TrackSlice {
   tracks: ViewTrackModel[]
   current: ViewTrackModel | null
   setTracks: (tracks: ViewTrackModel[]) => void
   updateDefaultVideo: (params: { track: ViewTrackModel; youtubeVideoId: string }) => void
   addYtToTrackInPlaylistQuery: (params: { trackId: number; ytPayload: YoutubeVideo }) => void
   addYtToTrackInStore: (params: { trackId: number | string; ytPayload: YoutubeVideo }) => void
   isYtLoading: boolean
}

export interface HistorySlice {
   history: ViewTrackModel[]
   currentIndexAtHistory: number
   back: () => void
   next: () => void
   addToHistory: (track: ViewTrackModel) => void
   clearHistory: () => void
   randomType: RandomType
}

export type InitSlice = {
   adapter: BasePlayer | null
   mode: 'shaka' | 'iframe' | null
   initAdapter: () => Promise<void>
   setMode: (mode: 'shaka' | 'iframe') => void

   videoElement: HTMLVideoElement | null
   shakaPlayer: shaka.Player | null
   shakaContainer: HTMLDivElement | null
   playerRef: any | null
   bgContainer: HTMLDivElement | null

   currentTime: number
   duration: number
   volume: number
   isMuted: boolean
   seekTo: (time: number) => void
   setVolume: (volume: number) => void
   setMuted: (muted: boolean) => void
}

export type AudioStore = PlayerSlice & InitSlice & TrackSlice & HistorySlice
