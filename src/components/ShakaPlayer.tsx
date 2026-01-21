import React, { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'
import 'shaka-player/dist/controls.css'
import { Innertube, UniversalCache, Utils, YT, Platform, Types, Constants } from 'youtubei.js/web'
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter'
import { botguardService } from '../lib/BotguardService'
import { ShakaPlayerAdapter } from '../lib/ShakaPlayerAdapter'
import { buildSabrFormat } from 'googlevideo/utils'
import { fetchFunction } from '../lib/helpers'
import Button from './Button'
import { CachedVideoData, getPlaybackDataFromSession, setPlaybackDataToSession } from '../utils/session'
import { pl } from 'zod/v4/locales'
import { twMerge } from 'tailwind-merge'
import InnertubeClient, { RelatedVideo, VideoDetails } from '../lib/InnertubeClient'
import YtVideoCardsNative from './YTVideoCardsNative'
import { useAudioStore } from '../audio_store/useAudioStore'

export default function ShakaPlayer({
   videoId,
   ref,
   ...props
}: { videoId: string; ref?: Ref<HTMLInputElement> } & React.VideoHTMLAttributes<HTMLVideoElement>) {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const playerRef = useRef<shaka.Player | null>(null)
   const sabrAdapterRef = useRef<SabrStreamingAdapter | null>(null)
   const [isReady, setIsReady] = useState(false)
   const [videosInfo, setVideosInfo] = useState<{ details: VideoDetails; relatedVideos: RelatedVideo[] } | null>(null)

   const updateState = useAudioStore((state) => state.updateState)
   const isPlaying = useAudioStore((state) => state.isPlaying)

   // Стан для Innertube та BotGuard
   const servicesRef = useRef<{ innertube: Innertube | null }>({ innertube: null })

   // Глобальні змінні з прикладу, тепер в refs
   const playbackContext = useRef<{
      poToken?: string
      coldStartToken?: string
      contentBinding?: string
      creationLock: boolean
   }>({ creationLock: false })

   const playbackStorage = useRef<Partial<CachedVideoData>>({})

   async function decipherUrlAndAddToStorageObject(server_abr_streaming_url: string | null | undefined) {
      if (!server_abr_streaming_url) throw new Error('No server_abr_streaming_url provided')
      const yt = servicesRef.current.innertube
      if (!yt) throw new Error('Innertube not initialized')

      const url = await yt.session.player!.decipher(server_abr_streaming_url)
      playbackStorage.current.streamingUrl = url

      const expireTimestamp = new URL(url).searchParams.get('expire')
      if (expireTimestamp) playbackStorage.current.expire = parseInt(expireTimestamp)
      return url
   }

   // Services Initialization
   useEffect(() => {
      const initServices = async () => {
         try {
            shaka.polyfill.installAll()

            // init Innertube
            const yt = await InnertubeClient.getInstance()
            servicesRef.current.innertube = yt
            console.log('[Player] Innertube loaded')

            // init BotGuard
            await botguardService.init()
            console.log('[Player] BotGuard loaded')

            // init Shaka Player
            if (videoRef.current && containerRef.current) {
               const player = new shaka.Player()
               await player.attach(videoRef.current)
               const ui = new shaka.ui.Overlay(player, containerRef.current, videoRef.current)
               ui.configure({
                  addBigPlayButton: false,
                  overflowMenuButtons: [
                     'captions',
                     'quality',
                     'language',
                     'chapter',
                     'picture_in_picture',
                     'playback_rate',
                     'loop',
                     'recenter_vr',
                     'toggle_stereoscopic',
                     'save_video_frame',
                  ],
                  customContextMenu: true,
               })

               player.configure({
                  abr: { enabled: true },
                  streaming: {
                     bufferingGoal: 120,
                     rebufferingGoal: 2,
                  },
                  preferredAudioCodecs: ['opus', 'mp4a.40.2'],
               })

               playerRef.current = player
               console.log('[Player] Shaka UI loaded')
               setIsReady(true)

               const { relatedVideos, details } = await InnertubeClient.getVideoInfo(videoId)
               setVideosInfo({ relatedVideos, details })
            }
         } catch (e) {
            console.error('Init failed', e)
         }
      }

      initServices()
      return () => {
         playerRef.current?.destroy()
         sabrAdapterRef.current?.dispose()
      }
   }, [])

   // generate tokens
   const mintToken = async () => {
      const ctx = playbackContext.current
      if (!ctx.contentBinding || ctx.creationLock) return

      ctx.creationLock = true
      try {
         ctx.coldStartToken = botguardService.mintColdStartToken(ctx.contentBinding)
         if (!botguardService.isInitialized()) await botguardService.reinit()

         if (botguardService.integrityTokenBasedMinter) {
            ctx.poToken = await botguardService.integrityTokenBasedMinter.mintAsWebsafeString(
               decodeURIComponent(ctx.contentBinding),
            )
         }
      } finally {
         ctx.creationLock = false
      }
   }

   // load video
   useEffect(() => {
      const load = async () => {
         const player = playerRef.current
         const yt = servicesRef.current.innertube
         if (!videoId || !player || !yt) return

         console.log('[Player] Loading video...', videoId)

         // unload previous
         await player.unload()
         sabrAdapterRef.current?.dispose()

         // context for tokens
         playbackContext.current = {
            contentBinding: videoId,
            creationLock: false,
            poToken: undefined,
         }

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
         sabrAdapterRef.current = sabrAdapter

         // Логіка токенів
         sabrAdapter.onMintPoToken(async () => {
            if (!playbackContext.current.poToken) {
               await mintToken()
            }
            return playbackContext.current.poToken || playbackContext.current.coldStartToken || ''
         })

         // Логіка reload (важлива для довгих відео)
         sabrAdapter.onReloadPlayerResponse(async (reloadContext) => {
            const innertube = servicesRef.current.innertube
            if (!innertube) throw new Error('Innertube not initialized')
            console.log('[SABR]', 'Reloading player response...')

            const parsedInfo = await InnertubeClient.getReloadedVideoStreamInfo(videoId, reloadContext)
            sabrAdapter.setStreamingURL(
               await decipherUrlAndAddToStorageObject(parsedInfo.streaming_data?.server_abr_streaming_url),
            )
            const ustreamerConfig =
               videoInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config
            if (!ustreamerConfig) return
            sabrAdapter.setUstreamerConfig(ustreamerConfig)
            playbackStorage.current.ustreamerConfig = ustreamerConfig
         })

         sabrAdapter.attach(player)

         // check storage for cached data
         const cachedData = getPlaybackDataFromSession(videoId)
         if (cachedData) {
            console.log('[SABR] Using cached playback data from session storage')
            sabrAdapter.setStreamingURL(cachedData.streamingUrl)
            sabrAdapter.setServerAbrFormats(cachedData.formats)
            sabrAdapter.setUstreamerConfig(cachedData.ustreamerConfig)
            await player.load(cachedData.manifestUri)
            return
         }

         // get video info
         const videoInfo = await InnertubeClient.getVideoStreamInfo(videoId)

         const ustreamerConfig =
            videoInfo.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config

         if (ustreamerConfig) {
            sabrAdapter.setUstreamerConfig(ustreamerConfig)
            playbackStorage.current.ustreamerConfig = ustreamerConfig
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
            playbackStorage.current.formats = formats
         }

         // Генеруємо маніфест
         const manifestUri = `data:application/dash+xml;base64,${btoa(
            await videoInfo.toDash({
               manifest_options: { is_sabr: true, include_thumbnails: false },
            }),
         )}`

         await player.load(manifestUri)
         playbackStorage.current.manifestUri = manifestUri
         console.log('[Player] Manifest loaded')

         setPlaybackDataToSession(videoId, playbackStorage.current)
      }
      load()
   }, [videoId, isReady])

   return (
      <div>
         <div ref={containerRef} className="relative w-full aspect-video bg-black group overflow-hidden">
            <div
               className={twMerge(
                  'absolute top-0 left-0 w-full p-4 z-[11] bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 flex flex-row items-center gap-2',
                  !isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
               )}
            >
               <a href={'https://www.youtube.com/channel/' + videosInfo?.details.channel.id} target="_blank" rel="noreferrer">
                  <img src={videosInfo?.details.channel.avatarUrl} className="rounded-full size-10" />
               </a>

               <a
                  href={'https://www.youtube.com/watch?v=' + videoId}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white text-lg font-bold drop-shadow-md select-text hover:underline text-shadow-xs"
               >
                  {videosInfo?.details.title || 'Loading...'}
               </a>
            </div>

            <video
               ref={videoRef}
               className="w-full h-full"
               autoPlay
               crossOrigin="anonymous"
               {...props}
               onPlay={() => updateState({ isPlaying: true })}
               onPause={() => updateState({ isPlaying: false })}
               onTimeUpdate={(e) => {
                  const currentSeconds = e.currentTarget.currentTime
                  const totalDuration = e.currentTarget.duration
                  console.log(`Позиція: ${currentSeconds.toFixed(2)} / ${totalDuration}`)
               }}
            />
         </div>
         <div className="w-[300px]">{videosInfo && <YtVideoCardsNative videos={videosInfo.relatedVideos} />}</div>
      </div>
   )
}
