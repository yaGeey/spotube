import { useEffect, useState } from 'react'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faVolumeLow, faVolumeOff, faVolumeXmark } from '@fortawesome/free-solid-svg-icons'
import Progress from './Progress'

export default function PlayerBarVolume() {
   const videoRef = useAudioStore((state) => state.adapter)
   const isMuted = useAudioStore((state) => state.isMuted)
   const volume = useAudioStore((state) => state.volume)
   const setVolume = useAudioStore((state) => state.setVolume)
   const setMuted = useAudioStore((state) => state.setMuted)

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         let vol
         if (e.code === 'ArrowUp' && videoRef) {
            e.preventDefault()
            vol = Math.min(volume + 5, 100)
         }
         if (e.code === 'ArrowDown' && videoRef) {
            e.preventDefault()
            vol = Math.max(volume - 5, 0)
         }
         if (vol !== undefined) {
            setVolume(vol)
         }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [videoRef, volume, setVolume])

   if (!videoRef) return null
   return (
      <div className="flex items-center gap-2 w-24 group">
         <button className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" onClick={() => setMuted(!isMuted)}>
            {isMuted ? (
               <FontAwesomeIcon icon={faVolumeXmark} />
            ) : !volume ? (
               <FontAwesomeIcon icon={faVolumeOff} />
            ) : volume < 40 ? (
               <FontAwesomeIcon icon={faVolumeLow} />
            ) : (
               <FontAwesomeIcon icon={faVolumeHigh} />
            )}
         </button>
         <Progress
            value={volume}
            setValue={setVolume}
            step={5}
            props={{
               onAuxClick: (e) => {
                  e.preventDefault()
                  setMuted(!isMuted)
               },
            }}
         />
      </div>
   )
}
