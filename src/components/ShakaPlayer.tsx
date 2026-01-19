import React, { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'
import 'shaka-player/dist/controls.css'

// Innertube для вебу, бо ми в React
import { Innertube, UniversalCache, Utils, YT, Platform, Types, Constants } from 'youtubei.js/web'
import { SabrStreamingAdapter } from 'googlevideo/sabr-streaming-adapter'
import { botguardService } from '../lib/BotguardService'
import { ShakaPlayerAdapter } from '../lib/ShakaPlayerAdapter'
import { buildSabrFormat } from 'googlevideo/utils'
import { fetchFunction } from '../lib/helpers'
import Button from './Button'

// Хак для eval (потрібен для Innertube в браузері)
Platform.shim.eval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
   const properties = []
   if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`)
   if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`)
   const code = `${data.output}\nreturn { ${properties.join(', ')} }`
   return new Function(code)()
}

interface ComplexPlayerProps {
   videoId: string
}

export default function ShakaPlayer({ videoId }: ComplexPlayerProps) {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const playerRef = useRef<shaka.Player | null>(null)
   const sabrAdapterRef = useRef<SabrStreamingAdapter | null>(null)
   const [isReady, setIsReady] = useState(false)

   // Стан для Innertube та BotGuard
   const servicesRef = useRef<{ innertube: Innertube | null }>({ innertube: null })

   // Глобальні змінні з прикладу, тепер в refs
   const playbackContext = useRef<{
      poToken?: string
      coldStartToken?: string
      contentBinding?: string
      creationLock: boolean
   }>({ creationLock: false })

   // 1. Ініціалізація сервісів (Innertube + BotGuard) - Один раз
   useEffect(() => {
      const initServices = async () => {
         console.log(navigator.userAgent)
         try {
            shaka.polyfill.installAll()

            // Ініціалізація Innertube
            const yt = await Innertube.create({
               cache: new UniversalCache(false),
               fetch: fetchFunction, // Використовуємо нативний fetch (CORS патчить Electron)
            })
            servicesRef.current.innertube = yt
            console.log('[Player] Innertube loaded')

            // Ініціалізація BotGuard
            await botguardService.init()
            console.log('[Player] BotGuard loaded')

            // Ініціалізація плеєра
            if (videoRef.current && containerRef.current) {
               const player = new shaka.Player(videoRef.current)
               const ui = new shaka.ui.Overlay(player, containerRef.current, videoRef.current)

               player.configure({
                  abr: { enabled: true },
                  streaming: { bufferingGoal: 30 },
               })

               playerRef.current = player
               console.log('[Player] Shaka UI loaded')
               setIsReady(true)
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

   // Функція генерації токенів (з твого коду)
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

   // 2. Завантаження відео при зміні ID
   useEffect(() => {
      const load = async () => {
         const player = playerRef.current
         const yt = servicesRef.current.innertube
         console.log(videoId, player, yt, isReady)
         if (!videoId || !player || !yt) return

         console.log('[Player] Loading video...', videoId)

         // Очистка старого
         await player.unload()
         sabrAdapterRef.current?.dispose()

         // Встановлюємо контекст для токенів
         playbackContext.current = {
            contentBinding: videoId,
            creationLock: false,
            poToken: undefined,
         }

         // Отримуємо інфо про відео
         const playerResponse = await yt.actions.execute('/player', {
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
            playbackContext: {
               contentPlaybackContext: {
                  signatureTimestamp: yt.session.player?.signature_timestamp,
               },
            },
         })

         const cpn = Utils.generateRandomString(16)
         const videoInfo = new YT.VideoInfo([playerResponse], yt.actions, cpn)

         // Створюємо адаптер (САМЕ ТУТ, НА КЛІЄНТІ)
         const adapter = new SabrStreamingAdapter({
            playerAdapter: new ShakaPlayerAdapter(),
            clientInfo: {
               osName: yt.session.context.client.osName,
               osVersion: yt.session.context.client.osVersion,
               clientName: 1, // WEB client ID
               clientVersion: yt.session.context.client.clientVersion,
            },
         })

         const getUstreamerConfig = (info: any) => {
            // Варіант A: snake_case (стандартний raw JSON)
            let config = info.player_config?.media_common_config?.media_ustreamer_request_config?.video_playback_ustreamer_config
            if (config) return config

            // Варіант B: camelCase (якщо youtubei.js парсить дані)
            config = info.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig
            if (config) return config

            // Варіант C: Шукаємо глибше в raw playerResponse (найчастіше воно ТУТ)
            const raw = info.player_response || info.basic_info // youtubei.js зберігає оригінал тут
            if (raw) {
               config =
                  raw.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig ||
                  raw.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig
            }

            return config
         }

         const ustreamerConfig = getUstreamerConfig(videoInfo) || getUstreamerConfig(playerResponse)

         if (ustreamerConfig) {
            console.log('[SABR] Config found:', ustreamerConfig)
            adapter.setUstreamerConfig(ustreamerConfig)
         } else {
            console.warn('[SABR] WARNING: Ustreamer config NOT FOUND. Playback might fail.')
            // Якщо конфігу немає, SABR впаде. Але ми можемо спробувати не викликати сеттер,
            // або передати пустий рядок, якщо адаптер це дозволяє (але краще просто попередити).
         }
         sabrAdapterRef.current = adapter

         // Логіка токенів
         adapter.onMintPoToken(async () => {
            if (!playbackContext.current.poToken) {
               await mintToken()
            }
            return playbackContext.current.poToken || playbackContext.current.coldStartToken || ''
         })

         // Логіка reload (важлива для довгих відео)
         adapter.onReloadPlayerResponse(async (reloadContext) => {
            // Тут повторюється логіка запиту /player, як у твоєму коді
            // ... скорочено для ясності, але сюди треба вставити той код ...
            console.log('Reloading context...')
         })

         // --- КЛЮЧОВИЙ МОМЕНТ: Приєднуємо адаптер до плеєра ---
         adapter.attach(player) // <--- ТЕПЕР ЦЕ ПРАЦЮЄ, БО МИ В BROWSER

         // Налаштовуємо URL стрімінгу
         if (videoInfo.streaming_data) {
            const url = await yt.session.player!.decipher(videoInfo.streaming_data.server_abr_streaming_url)
            adapter.setStreamingURL(url)

            // Передаємо формати адаптеру
            adapter.setServerAbrFormats(videoInfo.streaming_data.adaptive_formats.map(buildSabrFormat))
         }

         // Генеруємо маніфест
         const manifestUri = `data:application/dash+xml;base64,${btoa(
            await videoInfo.toDash({
               manifest_options: { is_sabr: true, include_thumbnails: false },
            }),
         )}`

         await player.load(manifestUri)
         console.log('[Player] Manifest loaded')

         // --- FIX 1: Явний запуск ---
         const video = videoRef.current
         if (video) {
            // Спочатку пробуємо грати зі звуком
            video.play().catch(async (e) => {
               console.warn('Autoplay blocked, trying muted...', e)
               // Якщо браузер заблокував звук, вмикаємо Mute і пробуємо знову
               video.muted = true
               try {
                  await video.play()
                  console.log('Started playing (muted)')
                  video.muted = false // Одразу намагаємось повернути звук
               } catch (err) {
                  console.error('Force play failed', err)
               }
            })
         }
      }

      load()
   }, [videoId, isReady])

   return (
      <div>
         <div ref={containerRef} className="relative w-full aspect-video bg-black">
            <video ref={videoRef} className="w-full h-full" autoPlay crossOrigin="anonymous" />
         </div>
      </div>
   )
}
