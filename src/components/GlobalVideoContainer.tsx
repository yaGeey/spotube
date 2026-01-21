// components/GlobalVideoContainer.tsx
import React, { useEffect, useRef } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui'
import { useAudioStore } from '../audio_store/useAudioStore'

// Експортуємо ID, щоб легко знаходити елемент (або можна через store)
export const GLOBAL_VIDEO_ID = 'shaka-global-video'

export default function GlobalVideoContainer() {
   const videoRef = useRef<HTMLVideoElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const { setShakaPlayerInstance, setGlobalVideoElement } = useAudioStore()

   useEffect(() => {
      // 1. Ініціалізація Shaka Player (один раз!)
      const initPlayer = async () => {
         const video = videoRef.current
         const container = containerRef.current
         if (!video || !container) return

         // Зберігаємо посилання на елемент в стор, щоб інші компоненти могли його брати
         setGlobalVideoElement(container)

         const player = new shaka.Player(video)
         // Налаштування ui (якщо треба)
         // const ui = new shaka.ui.Overlay(player, container, video);

         setShakaPlayerInstance(player)
      }

      initPlayer()
   }, [])

   return (
      // Цей div буде "домом" для відео, коли воно не на сторінці
      <div
         id="hidden-player-garage"
         className="fixed bottom-0 right-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
         // АБО стилізуйте його тут як PiP (Picture in Picture), коли він не на сторінці
      >
         {/* Це контейнер, який ми будемо переміщувати */}
         <div ref={containerRef} className="w-full h-full bg-black" id="movable-video-wrapper">
            <video ref={videoRef} id={GLOBAL_VIDEO_ID} className="w-full h-full" autoPlay playsInline />
         </div>
      </div>
   )
}
