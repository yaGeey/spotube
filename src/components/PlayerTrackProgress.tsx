import { useEffect, useState, useCallback } from 'react'
import { formatDuration } from '../utils/time'
import { useAudioStore } from '../hooks/useAudioStore'
import Progress from './Progress'

export default function PlayerTrackProgress() {
   const { current, playerRef, isPlaying } = useAudioStore()
   const [time, setTime] = useState(0) // in seconds
   const [duration, setDuration] = useState(0) // in seconds
   const [progress, setProgress] = useState(0)
   const STEP = 10

   const updateProgress = useCallback(() => {
      const curTime = playerRef.getCurrentTime()
      const dur = playerRef.getDuration()
      setTime(curTime)
      setDuration(dur)
      setProgress((curTime / dur) * 100)
   }, [playerRef])

   useEffect(() => {
      const interval = setInterval(() => {
         if (isPlaying && playerRef) updateProgress()
      }, 1000)
      return () => clearInterval(interval)
   }, [current, isPlaying, playerRef, updateProgress])

   const handleProgressChange = useCallback(
      (newProgress: number) => {
         if (!playerRef) return
         const dur = playerRef.getDuration()
         const newTime = (newProgress / 100) * dur
         playerRef.seekTo(newTime)
         setProgress(newProgress)
         setTime(newTime)
      },
      [playerRef]
   )

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
      <div className="w-full flex items-center gap-2 text-xs group text-neutral-400 font-medium font-mono">
         <span>{formatDuration(time)}</span>
         <Progress value={progress} setValue={handleProgressChange} step={10} setOnRelease={true} />
         <span>{formatDuration(duration)}</span>
      </div>
   )
}
