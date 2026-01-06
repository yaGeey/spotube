import { useEffect, useState } from 'react'
import { useAudioStore } from '../hooks/useAudioStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faVolumeLow, faVolumeOff, faVolumeXmark } from '@fortawesome/free-solid-svg-icons'

export default function PlayerVolume() {
   const { playerRef } = useAudioStore()
   const [volume, setVolume] = useState<number>(playerRef?.getVolume() ?? 0)

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         let vol
         if (e.code === 'ArrowUp' && playerRef) {
            e.preventDefault()
            vol = Math.min(playerRef.getVolume() + 5, 100)
         }
         if (e.code === 'ArrowDown' && playerRef) {
            e.preventDefault()
            vol = Math.max(playerRef.getVolume() - 5, 0)
         }
         if (vol !== undefined) {
            playerRef.setVolume(vol)
            setVolume(vol)
         }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [playerRef])

   return (
      <>
         <button className="text-neutral-400 hover:text-white transition-colors size-4"></button>
         <div className="flex items-center gap-2 w-24 group">
            <button
               className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors"
               onClick={() => {
                  if (!playerRef) return
                  playerRef.isMuted() ? playerRef.unMute() : playerRef.mute()
               }}
               onAuxClick={(e) => {
                  e.preventDefault()
                  if (!playerRef) return
                  playerRef.isMuted() ? playerRef.unMute() : playerRef.mute()
               }}
            >
               {playerRef.isMuted ? (
                  <FontAwesomeIcon icon={faVolumeXmark} />
               ) : !volume ? (
                  <FontAwesomeIcon icon={faVolumeOff} />
               ) : volume < 40 ? (
                  <FontAwesomeIcon icon={faVolumeLow} />
               ) : (
                  <FontAwesomeIcon icon={faVolumeHigh} />
               )}
            </button>
            <div
               className="h-1 bg-neutral-600 rounded-full w-full relative cursor-pointer"
               onWheel={(e) => {
                  if (!playerRef) return
                  let newVolume
                  if (e.deltaY < 0) newVolume = Math.min(volume + 5, 100)
                  else newVolume = Math.max(volume - 5, 0)
                  playerRef.setVolume(newVolume)
                  setVolume(newVolume)
               }}
               onClick={(e) => {
                  if (!playerRef) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const percentage = clickX / rect.width
                  const newVolume = Math.round(percentage * 100)
                  playerRef.setVolume(newVolume)
                  setVolume(newVolume)
               }}
            >
               <div
                  className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
                  style={{ width: `${volume}%` }}
               ></div>
            </div>
         </div>
      </>
   )
}
