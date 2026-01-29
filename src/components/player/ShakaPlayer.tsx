import { useAudioStore } from '@/src/audio_store/useAudioStore'
import React, { useEffect, useRef } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'

function ShakaPlayer() {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)

   const updateState = useAudioStore((state) => state.updateState)
   const mode = useAudioStore((state) => state.mode)

   useEffect(() => {
      const init = async () => {
         shaka.polyfill.installAll()

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
            useAudioStore.getState().initAdapter()
         }
      }
      if (mode === 'shaka') init()
      // No cleanup needed as we want the player to persist
   }, [updateState, mode])
   return (
      <div ref={containerRef} className="relative w-full aspect-video bg-black group overflow-hidden">
         <video
            ref={videoRef}
            className="w-full h-full"
            autoPlay
            crossOrigin="anonymous"
            onPlay={() => updateState({ isPlaying: true })}
            onPause={() => updateState({ isPlaying: false })}
            onEnded={() => useAudioStore.getState().next()}
            onTimeUpdate={(e) => updateState({ currentTime: e.currentTarget.currentTime })}
            onDurationChange={(e) => updateState({ duration: e.currentTarget.duration })}
            onVolumeChange={(e) =>
               updateState({
                  volume: Math.floor(e.currentTarget.volume * 100),
                  isMuted: e.currentTarget.muted,
               })
            }
         />
      </div>
   )
}
export default React.memo(ShakaPlayer, () => true) // never re-render
