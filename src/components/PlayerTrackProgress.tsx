import { useEffect, useState } from 'react'
import { formatDuration } from '../utils/time'
import { useAudioStore } from '../hooks/useAudioStore'

export default function PlayerTrackProgress() {
   const { current, playerRef, isPlaying } = useAudioStore()
   const [currentTime, setCurrentTime] = useState<string>('0:00')

   const [progress, setProgress] = useState(30)
   useEffect(() => {
      const interval = setInterval(() => {
         if (playerRef && isPlaying) {
            setCurrentTime(formatDuration(playerRef.getCurrentTime()))
            const prog = (playerRef.getCurrentTime() / playerRef.getDuration()) * 100
            setProgress(prog)
         }
      }, 1000)
      return () => clearInterval(interval)
   }, [current, isPlaying, playerRef])

   return (
      <div className="w-full flex items-center gap-2 text-xs text-neutral-400 font-medium font-mono">
         <span>{currentTime}</span>
         <div className="h-1 bg-neutral-600 rounded-full w-full relative group cursor-pointer">
            <div
               className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
               style={{ width: `${progress}%` }}
            ></div>
            <div
               className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
               style={{ left: `${progress}%` }}
            ></div>
         </div>
         <span>{formatDuration(playerRef.getDuration())}</span>
      </div>
   )
}
