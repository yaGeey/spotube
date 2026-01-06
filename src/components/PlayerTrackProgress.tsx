import { useEffect, useState, useCallback } from 'react'
import { formatDuration } from '../utils/time'
import { useAudioStore } from '../hooks/useAudioStore'

export default function PlayerTrackProgress() {
   const { current, playerRef, isPlaying } = useAudioStore()
   const [time, setTime] = useState(0) // in seconds
   const [progress, setProgress] = useState(0)
   const STEP = 10

   const updateProgress = useCallback(() => {
      const curTime = playerRef.getCurrentTime()
      setTime(curTime)
      setProgress((curTime / playerRef.getDuration()) * 100)
   }, [playerRef])

   useEffect(() => {
      const interval = setInterval(() => {
         if (isPlaying && playerRef) updateProgress()
      }, 1000)
      return () => clearInterval(interval)
   }, [current, isPlaying, playerRef])

   const rewind = useCallback(
      (amount: number) => {
         if (!playerRef) return
         const curTime = playerRef.getCurrentTime()
         playerRef.seekTo(Math.min(Math.max(curTime + amount, 0), playerRef.getDuration()))
         updateProgress()
      },
      [playerRef, updateProgress]
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
      <div className="w-full flex items-center gap-2 text-xs text-neutral-400 font-medium font-mono">
         <span>{formatDuration(time)}</span>
         <div
            className="h-1 bg-neutral-600 rounded-full w-full relative group cursor-pointer"
            onWheel={(e) => {
               if (!playerRef) return
               rewind(Math.sign(e.deltaY) * -STEP)
            }}
            onClick={(e) => {
               if (!playerRef) return
               const rect = e.currentTarget.getBoundingClientRect()
               const clickX = e.clientX - rect.left
               const percentage = clickX / rect.width
               const newTime = percentage * playerRef.getDuration()
               playerRef.seekTo(newTime)
               updateProgress()
            }}
         >
            <div
               className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500"
               style={{ width: `${progress}%` }}
            ></div>
            <div
               className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100"
               style={{ left: `${progress}%` }}
            ></div>
         </div>
         <span>{formatDuration(playerRef.getDuration())}</span>
      </div>
   )
}
