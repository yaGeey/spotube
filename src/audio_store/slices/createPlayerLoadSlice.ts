import { StateCreator } from 'zustand'
import { AudioStore, PlayerLoadSlice } from '../types'
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter'
import { ShakaPlayerAdapter } from '@/src/lib/ShakaPlayerAdapter'
import InnertubeClient from '@/src/lib/InnertubeClient'
import { CachedVideoData, getPlaybackDataFromSession, setPlaybackDataToSession } from '@/src/utils/session'
import { buildSabrFormat } from 'googlevideo/utils'
import { botguardService } from '@/src/lib/BotguardService'

export const createPlayerLoadSlice: StateCreator<AudioStore, [], [], PlayerLoadSlice> = (set, get) => ({
   playerRef: null,
   shakaRef: null,
   innertube: null,
   sabrAdapter: null,

   poToken: null,
   coldStartToken: null,
   contentBinding: null,
   creationLock: false,

   loadVideo: async (videoId: string) => {
      const { mintToken, shakaRef, innertube: yt, sabrAdapter: oldAdapter, updateState, poToken, coldStartToken } = get()
      if (!shakaRef || !yt) return console.error('[Store] Player or Innertube not initialized')

      updateState({
         contentBinding: videoId,
         poToken: null,
         coldStartToken: null,
         creationLock: false,
      })

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
      await shakaRef.unload()
      if (oldAdapter) oldAdapter.dispose()

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

      // Логіка токенів
      sabrAdapter.onMintPoToken(async () => {
         // Беремо актуальні токени зі стору на момент виклику
         const state = get()
         if (!state.poToken) await state.mintToken()
         return get().poToken || get().coldStartToken || ''
      })

      // Логіка reload (важлива для довгих відео)
      sabrAdapter.onReloadPlayerResponse(async (reloadContext) => {
         if (!yt) throw new Error('Innertube not initialized')
         console.log('[SABR]', 'Reloading player response...')

         const parsedInfo = await InnertubeClient.getReloadedVideoStreamInfo(videoId, reloadContext)
         sabrAdapter.setStreamingURL(await decipherUrlAndAddToStorageObject(parsedInfo.streaming_data?.server_abr_streaming_url))
         const ustreamerConfig =
            videoInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config
         if (!ustreamerConfig) return
         sabrAdapter.setUstreamerConfig(ustreamerConfig)
         playbackStorage.ustreamerConfig = ustreamerConfig
      })

      sabrAdapter.attach(shakaRef)
      updateState({ sabrAdapter })

      // check storage for cached data
      const cachedData = getPlaybackDataFromSession(videoId)
      if (cachedData) {
         console.log('[SABR] Using cached playback data from session storage')
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
   },

   mintToken: async () => {
      const { contentBinding, creationLock, updateState } = get()
      if (!contentBinding || creationLock) return

      updateState({ creationLock: true })
      try {
         updateState({ coldStartToken: botguardService.mintColdStartToken(contentBinding) })
         if (!botguardService.isInitialized()) await botguardService.reinit()

         if (botguardService.integrityTokenBasedMinter) {
            const poToken = await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(
               decodeURIComponent(contentBinding),
            )
            updateState({ poToken })
         }
      } finally {
         updateState({ creationLock: false })
      }
   },

   cleanup: () => {
      const { sabrAdapter, shakaRef, updateState } = get()
      if (sabrAdapter) {
         sabrAdapter.dispose()
         updateState({ sabrAdapter: null })
      }
      if (shakaRef) {
         shakaRef.unload()
         updateState({ shakaRef: null })
      }
   },
})
