import React, { useEffect, useRef } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'
import 'shaka-player/dist/controls.css'
import { useAudioStore } from '../audio_store/useAudioStore'
import InnertubeClient from '../lib/InnertubeClient'
import { botguardService } from '../lib/BotguardService'

export const GlobalPlayerController = ({ ...props }: { props?: React.VideoHTMLAttributes<HTMLVideoElement> }) => {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const bgContainerRef = useRef<HTMLDivElement>(null)

   const updateState = useAudioStore((state) => state.updateState)
   const next = useAudioStore((state) => state.next)

   useEffect(() => {
      const init = async () => {
         shaka.polyfill.installAll()
         const innertube = await InnertubeClient.getInstance()
         updateState({ innertube })
         await botguardService.init()
         console.log('[Player] BotGuard & Inertube loaded')

         if (videoRef.current && containerRef.current) {
            const player = new shaka.Player()
            await player.attach(videoRef.current)

            const ui = new shaka.ui.Overlay(player, containerRef.current, videoRef.current)
            ui.configure({
               addBigPlayButton: false,
               // prettier-ignore
               overflowMenuButtons: ['captions', 'quality', 'language', 'chapter', 'picture_in_picture', 'playback_rate', 'loop', 'toggle_stereoscopic', 'save_video_frame'],
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
            updateState({ shakaPlayer: player, videoElement: videoRef.current, shakaContainer: containerRef.current })
         }
      }
      init()
      // No cleanup needed as we want the player to persist
   }, [updateState])

   useEffect(() => {
      if (bgContainerRef.current) {
         updateState({ bgContainer: bgContainerRef.current })
      }
   }, [updateState])

   return (
      <div style={{ display: 'none' }} ref={bgContainerRef}>
         <div ref={containerRef} className="relative w-full aspect-video bg-black group overflow-hidden">
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
