import { useEffect, useState } from 'react'
import { useAudioStore } from '../hooks/useAudioStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faVolumeLow, faVolumeOff, faVolumeXmark } from '@fortawesome/free-solid-svg-icons'
import Progress from './Progress'

export default function PlayerVolume() {
   const { playerRef } = useAudioStore()

   const [isMuted, setIsMuted] = useState<boolean>(() => {
      const savedIsMuted = localStorage.getItem('player-muted')
      return savedIsMuted ? savedIsMuted === '1' : false
   })
   const [volume, setVolume] = useState<number>(() => {
      const savedVolume = localStorage.getItem('player-volume')
      return savedVolume ? parseInt(savedVolume, 10) : playerRef?.getVolume() ?? 0
   })

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
            setVolume(vol)
         }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [playerRef])

   // subscriber for volume
   useEffect(() => {
      localStorage.setItem('player-volume', volume.toString())
      if (playerRef) playerRef.setVolume(volume)
   }, [volume, playerRef])

   // subscriber for mute
   useEffect(() => {
      localStorage.setItem('player-muted', isMuted ? '1' : '0')
      if (playerRef) {
         if (isMuted) playerRef.mute()
         else playerRef.unMute()
      }
   }, [isMuted, playerRef])

   return (
      <>
         <div className="flex items-center gap-2 w-24 group">
            <button
               className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors"
               onClick={() => {
                  if (!playerRef) return
                  setIsMuted((p) => !p)
               }}
            >
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
                     if (!playerRef) return
                     setIsMuted((p) => !p)
                  },
               }}
            />
         </div>
      </>
   )
}
