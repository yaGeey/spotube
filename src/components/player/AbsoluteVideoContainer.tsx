import { useAudioStore } from '@/src/audio_store/useAudioStore'
import React, { useEffect, useRef } from 'react'
import ShakaPlayer from './ShakaPlayer'
import YouTubePlayer from '../YouTubePlayer'

export default function AbsoluteVideoContainer() {
   const ref = useRef<HTMLDivElement>(null)
   useEffect(() => {
      if (ref.current) {
         useAudioStore.setState({ absoluteContainer: ref.current })
      }
   }, [ref])

   const hiddenStyle = {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: '1px',
      height: '1px',
      visibility: 'visible',
   } satisfies React.CSSProperties
   return (
      <div ref={ref} style={hiddenStyle}>
         <VideoPlayer />
      </div>
   )
}

function VideoPlayer() {
   const mode = useAudioStore((state) => state.mode)
   return (
      <>
         {mode === 'shaka' && <ShakaPlayer />}
         {mode === 'iframe' && <YouTubePlayer />}
      </>
   )
}
