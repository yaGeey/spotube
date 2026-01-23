export default abstract class BasePlayerAdapter {
   abstract instance: any
   abstract dispose(): void
   abstract loadVideo(videoId: string): void
   abstract play(): void
   abstract pause(): void
   abstract seekTo(seconds: number): void
   abstract requestFullscreen(): void

   abstract getCurrentTime(): number
   abstract getDuration(): number

   abstract isMuted(): boolean
   abstract setMuted(value: boolean): void

   abstract setVolume(volume: number): void
   abstract getVolume(): number
}
