import { CachedVideoData } from '../utils/session'
import BasePlayer from './BasePlayerAdapter'
import shaka from 'shaka-player/dist/shaka-player.ui'
import InnertubeClient from '../lib/InnertubeClient'
import { buildSabrFormat } from 'googlevideo/utils'
import { botguardService } from '../lib/BotguardService'
import { getPlaybackDataFromSession, setPlaybackDataToSession } from '../utils/session'
import type Innertube from 'youtubei.js/web'
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter'
import { ShakaPlayerAdapter } from '../lib/ShakaPlayerAdapter'

export default class ShakaAdapter extends BasePlayer {
   public type: string = 'shaka'
   private poToken: string | null = null
   private coldStartToken: string | null = null
   private contentBinding: string | null = null
   private creationLock: boolean = false

   private innertube: Innertube | null = null
   private sabrAdapter: SabrStreamingAdapter | null = null

   private constructor(
      public instance: HTMLVideoElement,
      public shakaPlayer: shaka.Player,
   ) {
      super()
      shaka.polyfill.installAll()
   }

   public static async create(videoElement: HTMLVideoElement, shakaPlayer: shaka.Player): Promise<ShakaAdapter> {
      const adapter = new ShakaAdapter(videoElement, shakaPlayer)
      adapter.innertube = await InnertubeClient.getInstance()
      await botguardService.init()
      console.log('[Player] BotGuard & Inertube loaded')
      return adapter
   }

   async loadVideo(videoId: string): Promise<void> {
      const yt = this.innertube
      if (!yt) throw new Error('Innertube not initialized')

      const shakaRef = this.shakaPlayer

      const playbackStorage: Partial<CachedVideoData> = {}

      async function decipherUrlAndAddToStorageObject(server_abr_streaming_url: string | null | undefined) {
         if (!server_abr_streaming_url) throw new Error('No server_abr_streaming_url provided')
         if (!yt) throw new Error('Innertube not initialized')

         const url = await yt.session.player!.decipher(server_abr_streaming_url)
         playbackStorage.streamingUrl = url

         const expireTimestamp = new URL(url).searchParams.get('expire')
         if (expireTimestamp) playbackStorage.expire = parseInt(expireTimestamp)
         return url
      }

      console.log('[Player] Loading video...', videoId)

      // unload previous
      //? Token generates for each video separately
      this.contentBinding = videoId
      this.poToken = null
      this.coldStartToken = null
      this.creationLock = false
      await shakaRef.unload() //? stop buffering previous video
      if (this.sabrAdapter) this.sabrAdapter.dispose() //? kill active network listeners

      // init SABR adapter
      const sabrAdapter = new SabrStreamingAdapter({
         playerAdapter: new ShakaPlayerAdapter(),
         clientInfo: {
            osName: yt.session.context.client.osName,
            osVersion: yt.session.context.client.osVersion,
            clientName: 1, // WEB client ID
            clientVersion: yt.session.context.client.clientVersion,
         },
      })

      sabrAdapter.onMintPoToken(async () => {
         // Беремо актуальні токени зі стору на момент виклику
         if (!this.poToken) await this.mintToken()
         return this.poToken || this.coldStartToken || ''
      })

      // reload videos (for 6+ hours long videos, when URL expires)
      sabrAdapter.onReloadPlayerResponse(async (reloadContext) => {
         if (!yt) throw new Error('Innertube not initialized')
         console.log('[SABR]', 'Reloading player response...')

         const parsedInfo = await InnertubeClient.getReloadedVideoStreamInfo(videoId, reloadContext)
         sabrAdapter.setStreamingURL(await decipherUrlAndAddToStorageObject(parsedInfo.streaming_data?.server_abr_streaming_url))
         const ustreamerConfig = playbackStorage.ustreamerConfig
         // videoInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config
         if (!ustreamerConfig) return
         sabrAdapter.setUstreamerConfig(ustreamerConfig)
         playbackStorage.ustreamerConfig = ustreamerConfig
      })

      sabrAdapter.attach(shakaRef)
      this.sabrAdapter = sabrAdapter

      // check storage for cached data
      const cachedData = getPlaybackDataFromSession(videoId)
      if (cachedData) {
         console.log('[SABR] Using cached playback data from session storage')
         // FIX: Наповнюємо playbackStorage даними з кешу, щоб Reload мав до них доступ
         Object.assign(playbackStorage, cachedData)
         sabrAdapter.setStreamingURL(cachedData.streamingUrl)
         sabrAdapter.setServerAbrFormats(cachedData.formats)
         sabrAdapter.setUstreamerConfig(cachedData.ustreamerConfig)
         await shakaRef.load(cachedData.manifestUri)
         return
      }

      // get video info
      const videoInfo = await InnertubeClient.getVideoStreamInfo(videoId)

      const ustreamerConfig =
         videoInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config

      if (ustreamerConfig) {
         sabrAdapter.setUstreamerConfig(ustreamerConfig)
         playbackStorage.ustreamerConfig = ustreamerConfig
      } else {
         console.warn('[SABR] WARNING: Ustreamer config NOT FOUND. Playback might fail.')
         // Якщо конфігу немає, SABR впаде. Але ми можемо спробувати не викликати сеттер,
         // або передати пустий рядок, якщо адаптер це дозволяє (але краще просто попередити).
      }

      // Налаштовуємо URL стрімінгу
      if (videoInfo.streaming_data) {
         sabrAdapter.setStreamingURL(await decipherUrlAndAddToStorageObject(videoInfo.streaming_data.server_abr_streaming_url))

         // Передаємо формати адаптеру
         const formats = videoInfo.streaming_data.adaptive_formats.map(buildSabrFormat)
         sabrAdapter.setServerAbrFormats(formats)
         playbackStorage.formats = formats
      }

      // Генеруємо маніфест
      const manifestUri = `data:application/dash+xml;base64,${btoa(
         await videoInfo.toDash({
            manifest_options: { is_sabr: true, include_thumbnails: false },
         }),
      )}`

      await shakaRef.load(manifestUri)
      playbackStorage.manifestUri = manifestUri
      console.log('[Player] Manifest loaded')

      setPlaybackDataToSession(videoId, playbackStorage)
   }

   private async mintToken(): Promise<void> {
      if (!this.contentBinding || this.creationLock) return
      this.creationLock = true
      try {
         this.coldStartToken = botguardService.mintColdStartToken(this.contentBinding)
         if (!botguardService.isInitialized()) await botguardService.reinit()

         if (botguardService.integrityTokenBasedMinter) {
            this.poToken = await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(
               decodeURIComponent(this.contentBinding),
            )
         }
      } finally {
         this.creationLock = false
      }
   }

   play(): void {
      this.instance.play()
   }
   pause(): void {
      this.instance.pause()
   }
   requestFullscreen(): void {
      this.instance.requestFullscreen()
   }
   seekTo(seconds: number): void {
      this.instance.currentTime = seconds
   }
   getCurrentTime(): number {
      return this.instance.currentTime
   }
   getDuration(): number {
      return this.instance.duration
   }
   setMuted(value: boolean): void {
      this.instance.muted = value
   }
   isMuted(): boolean {
      return this.instance.muted
   }
   setVolume(volume: number): void {
      this.instance.volume = volume / 100
   }
   getVolume(): number {
      return this.instance.volume
   }

   dispose(): void {
      InnertubeClient.reset()
   }
}
