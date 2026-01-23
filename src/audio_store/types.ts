import { TrackWithRelations } from '@/electron/lib/prisma'
import { YoutubeVideo } from '@/generated/prisma/client'
import type { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter'
import type shaka from 'shaka-player/dist/shaka-player.ui'
import type Innertube from 'youtubei.js/web'
import BasePlayer from '../player/BasePlayerAdapter'
type RandomType = null | 'true' | 'leastPlayedAllTime' | 'leastPlayedNow'

// TODO make user select players (currently only iframe is implemented):
// videoRef - shaka player video element reference
// playerRef - youtube iframe reference
export interface PlayerLoadSlice {
   videoElement: HTMLVideoElement | null
   shakaPlayer: shaka.Player | null
   shakaContainer: HTMLDivElement | null
   innertube: Innertube | null
   sabrAdapter: SabrStreamingAdapter | null
   loadVideo: (videoId: string) => Promise<void>
   cleanup: () => void
   bgContainer: HTMLDivElement | null

   poToken: string | null
   coldStartToken: string | null
   contentBinding: string | null
   creationLock: boolean
   mintToken: () => Promise<void>
}

export interface PlayerSlice {
   playerRef: any | null
   play: ({
      track,
      forceVideoId,
      skipHistory,
   }: {
      track: TrackWithRelations
      forceVideoId?: string
      skipHistory?: boolean
   }) => void
   stop: () => void
   toggle: () => void
   isPlaying: boolean
   playlistId: number | undefined
   updateState: (state: Partial<AudioStore>) => void
}

export interface TrackSlice {
   tracks: TrackWithRelations[]
   current: TrackWithRelations | null
   setTracks: (tracks: TrackWithRelations[]) => void
   updateDefaultVideo: (params: { track: TrackWithRelations; youtubeVideoId: string }) => void
   addYtVideoToTrack: (params: { trackId: number; ytPayload: YoutubeVideo }) => void
   updateTrack: (params: { masterId: number; data: TrackWithRelations }) => void
   isYtLoading: boolean
}

export interface HistorySlice {
   history: TrackWithRelations[]
   currentIndexAtHistory: number
   back: () => void
   next: () => void
   addToHistory: (track: TrackWithRelations) => void
   clearHistory: () => void
   randomType: RandomType
}

export type InitSlice = {
   adapter: BasePlayer | null
   mode: 'shaka' | 'iframe' | null
   initAdapter: () => Promise<void>
   setMode: (mode: 'shaka' | 'iframe') => void

   currentTime: number
   duration: number
   volume: number
   isMuted: boolean
   seekTo: (time: number) => void
   setVolume: (volume: number) => void
   setMuted: (muted: boolean) => void
}

export type AudioStore = PlayerSlice & InitSlice & TrackSlice & HistorySlice & PlayerLoadSlice
