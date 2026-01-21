import { TrackWithRelations } from '@/electron/lib/prisma'
import { YoutubeVideo } from '@/generated/prisma/client'
import { ProxyTRPCContextProps } from '@trpc/react-query/shared'
type RandomType = null | 'true' | 'leastPlayedAllTime' | 'leastPlayedNow'

export interface PlayerSlice {
   playerRef: any
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
   setPlayerRef: (ref: any) => void
   toggle: () => void
   isPlaying: boolean
   setIsPlaying: (isPlaying: boolean) => void
   playlistId: number | undefined
   setPlaylistId: (playlistId: number) => void
   updateState: (state: Partial<PlayerSlice>) => void
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
   setRandomType: (type: RandomType) => void
}

export type AudioStore = PlayerSlice & TrackSlice & HistorySlice
