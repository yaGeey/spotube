import { useEffect, useState, useCallback } from 'react'
import { formatDuration } from '../../utils/time'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import Progress from '../Progress'

export default function ShakaPlayerBarTrackProgress() {
   const seekTo = useAudioStore((state) => state.seekTo)
   const time = useAudioStore((state) => state.currentTime)
   const duration = useAudioStore((state) => state.duration)

   const [progress, setProgress] = useState(0)
   const STEP = 10

   const handleProgressChange = useCallback(
      (newProgress: number) => {
         const newTime = (newProgress / 100) * duration
         seekTo(newTime)
         setProgress(newProgress)
      },
      [seekTo, duration],
   )

   const rewind = useCallback(
      (amount: number) => {
         seekTo(Math.min(Math.max(time + amount, 0), duration))
      },
      [seekTo, time, duration],
   )

   // rewind with keyboard arrows
   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.code === 'ArrowLeft') {
            e.preventDefault()
            rewind(-STEP)
         }
         if (e.code === 'ArrowRight') {
            e.preventDefault()
            rewind(STEP)
         }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [rewind])

   return (
      <div className="w-full flex items-center gap-2 text-xs group text-neutral-400 font-medium font-mono">
         <span>{formatDuration(time)}</span>
         <Progress value={progress} setValue={handleProgressChange} step={10} setOnRelease={true} />
         <span>{formatDuration(duration)}</span>
      </div>
   )
}
