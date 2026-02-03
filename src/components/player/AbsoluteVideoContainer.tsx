import { useAudioStore } from '@/src/audio_store/useAudioStore'
import React, { useEffect, useRef, useState } from 'react'
import ShakaPlayer from './ShakaPlayer'
import YouTubePlayer from '../YouTubePlayer'
import { motion, useDragControls, useMotionValue } from 'framer-motion'

export default function AbsoluteVideoContainer() {
   const isPip = useAudioStore((state) => state.isPip)
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

   const [pos, setPos] = useState<DOMRect | null>(null)
   useEffect(() => {
      if (!ref.current) return
      setPos(ref.current.getBoundingClientRect())
   }, [ref, isPip])

   const width = useMotionValue(pos?.width || 300)
   const height = useMotionValue(pos?.height || (300 * 9) / 16)
   return (
      <motion.div
         ref={ref}
         style={{
            ...hiddenStyle,
            width,
            height,
         }}
         drag={isPip}
         dragConstraints={{
            top: -pos?.top! + 20,
            left: -pos?.left! + 20,
            bottom: 0,
            right: 0,
         }}
         dragMomentum={false}
      >
         <VideoPlayer />
         {isPip && (
            <motion.div
               drag
               dragMomentum={false}
               dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
               dragElastic={0}
               onDrag={(e, info) => {
                  const newWidth = width.get() - info.delta.x
                  const newHeight = height.get() - info.delta.y

                  if (newWidth > 300) width.set(newWidth)
                  if (newHeight > 169) height.set(newHeight)
               }}
               className="size-5 bg-accent-darker absolute z-10000 left-0 top-0 cursor-nwse-resize [clip-path:polygon(0_0,100%_0,0_100%)]"
               whileHover={{ scale: 1.2 }}
               whileTap={{ scale: 0.9 }}
            />
         )}
      </motion.div>
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
