import BasePlayerAdapter from './BasePlayerAdapter'

export default class IFrameAdapter extends BasePlayerAdapter {
   constructor(public instance: any) {
      super()
   }
   loadVideo(videoId: string): void {
      this.instance.loadVideoById(videoId)
   }
   play(): void {
      this.instance.playVideo()
   }
   pause(): void {
      this.instance.pauseVideo()
   }
   requestFullscreen(): void {
      this.instance.getIframe().requestFullscreen()
   }
   seekTo(seconds: number): void {
      this.instance.seekTo(seconds)
   }
   getCurrentTime(): number {
      return this.instance.getCurrentTime()
   }
   getDuration(): number {
      return this.instance.getDuration()
   }
   setMuted(value: boolean): void {
      if (value) {
         this.instance.mute()
      } else {
         this.instance.unMute()
      }
   }
   isMuted(): boolean {
      return this.instance.isMuted()
   }
   // TODO все під arrow func, бо інакше this буде вказувати на інший контекст (чому?)
   setVolume = (volume: number): void => {
      this.instance.setVolume(volume)
   }
   getVolume(): number {
      return this.instance.getVolume()
   }
   dispose(): void {}
}
