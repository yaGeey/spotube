import YouTubePlayer from './YouTubePlayer'
import { twMerge } from 'tailwind-merge'
import ShakaPlayerSlot from './shaka/ShakaPlayerSlot'
import { useAudioStore } from '../audio_store/useAudioStore'
import { useRef } from 'react'

export default function VideoPlayer() {
   const current = useAudioStore((state) => state.current)
   const mode = useAudioStore((state) => state.mode)
   const isVisible = useAudioStore((state) => state.isVisible)

   const inLayoutRef = useRef<HTMLDivElement>(null)
   
   return (
      <div ref={inLayoutRef} className={twMerge('aspect-video block w-full', (!isVisible || !current) && 'hidden')}>
         {mode === 'shaka' && <ShakaPlayerSlot />}
         {mode === 'iframe' && <YouTubePlayer />}
      </div>
   )
}
