import React, { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'
import { twMerge } from 'tailwind-merge'
import InnertubeClient, { RelatedVideo, VideoDetails } from '../../lib/InnertubeClient'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { botguardService } from '@/src/lib/BotguardService'

export default function ShakaPlayer({
   videoId,
   ref,
   ...props
}: { videoId: string; ref?: Ref<HTMLInputElement> } & React.VideoHTMLAttributes<HTMLVideoElement>) {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const [isReady, setIsReady] = useState(false)
   const [videosInfo, setVideosInfo] = useState<{ details: VideoDetails; relatedVideos: RelatedVideo[] } | null>(null)

   const updateState = useAudioStore((state) => state.updateState)
   const isPlaying = useAudioStore((state) => state.isPlaying)
   const cleanup = useAudioStore((state) => state.cleanup)
   const next = useAudioStore((state) => state.next)

   // Services Initialization
   useEffect(() => {
      const initServices = async () => {
         try {
            shaka.polyfill.installAll()

            const innertube = await InnertubeClient.getInstance()
            updateState({ innertube })
            console.log('[Player] Innertube loaded')

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

               console.log('[Player] Shaka UI loaded')
               setIsReady(true)
               updateState({ shakaPlayer: player, videoElement: videoRef.current })

               const { relatedVideos, details } = await InnertubeClient.getVideoInfo(videoId)
               setVideosInfo({ relatedVideos, details })
            }
         } catch (e) {
            console.error('Init failed', e)
         }
      }

      initServices()
      return () => {
         cleanup()
      }
   }, [cleanup, updateState])

   // load video
   useEffect(() => {
      useAudioStore.getState().loadVideo(videoId)
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
               onEnded={() => next()}
               onTimeUpdate={(e) => updateState({ currentTime: e.currentTarget.currentTime })}
               onDurationChange={(e) => updateState({ duration: e.currentTarget.duration })}
               onVolumeChange={(e) =>
                  updateState({
                     volume: e.currentTarget.volume,
                     isMuted: e.currentTarget.muted,
                  })
               }
            />
         </div>
      </div>
   )
}
