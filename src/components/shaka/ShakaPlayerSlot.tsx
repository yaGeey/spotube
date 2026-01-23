import { useAudioStore } from '@/src/audio_store/useAudioStore'
import React, { useEffect, useRef } from 'react'

export default function ShakaPlayerSlot() {
   const slotRef = useRef<HTMLDivElement>(null)
   const shakaContainer = useAudioStore((state) => state.shakaContainer)
   const bgContainer = useAudioStore((state) => state.bgContainer)
   const videoElement = useAudioStore((state) => state.videoElement)

   useEffect(() => {
      if (!shakaContainer || !videoElement) return console.warn('Shaka container not found')
      const wasPlaying = !videoElement.paused
      const currentSlot = slotRef.current
      if (currentSlot && !currentSlot.hasChildNodes()) {
         currentSlot.appendChild(shakaContainer)
      }
      return () => {
         if (currentSlot && shakaContainer && currentSlot.contains(shakaContainer) && bgContainer) {
            currentSlot.removeChild(shakaContainer)
            bgContainer.appendChild(shakaContainer)
            videoElement.play().catch((e) => console.error('Play failed:', e))
         }
      }
   }, [shakaContainer, bgContainer, videoElement])
   return (
      <div>
         <div ref={slotRef} />
      </div>
   )
}
