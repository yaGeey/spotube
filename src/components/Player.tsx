import React, { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import PlayerTrackProgress from './PlayerTrackProgress'
import PlayerVolume from './PlayerBarVolume'
// prettier-ignore
import { MusicIcon, HeartIcon, ShuffleIcon, SkipBackIcon, PauseIcon, PlayIcon, SkipForwardIcon, RepeatIcon, Mic2Icon, ListMusicIcon, MonitorSpeakerIcon } from './Icons'
import { twMerge } from 'tailwind-merge'
import { vanillaTrpc } from '../utils/trpc'
import { useShallow } from 'zustand/react/shallow'
import ShakaPlayerBarTrackProgress from './shaka/ShakaPlayerBarTrackProgress'
import PlayerBarVolume from './PlayerBarVolume'

export default function Player() {
   const { current, toggle, playerRef, isPlaying, next, back, randomType, updateState, videoRef, mode } = useAudioStore(
      useShallow((state) => ({
         current: state.current,
         toggle: state.toggle,
         playerRef: state.playerRef,
         isPlaying: state.isPlaying,
         next: state.next,
         back: state.back,
         randomType: state.randomType,
         updateState: state.updateState,
         videoRef: state.videoElement,
         mode: state.mode,
      })),
   )

   useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault()
            toggle()
         }
         // prev/next
         if (e.code === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            back()
         }
         if (e.code === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            next()
         }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
   }, [toggle, next, back])

   // block page scrolling when hovering over the player
   const containerRef = useRef<HTMLDivElement>(null)
   useEffect(() => {
      const element = containerRef.current
      if (!element) return

      const handleWheel = (e: WheelEvent) => e.preventDefault()
      element.addEventListener('wheel', handleWheel, { passive: false })
      return () => element.removeEventListener('wheel', handleWheel)
   }, [current, playerRef])

   if (!current || (!playerRef && !videoRef)) return null
   return (
      <div
         className="fixed bottom-0 left-0 right-0 bg-main backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center justify-between text-white h-[90px] z-50"
         ref={containerRef}
      >
         {/* Left: Track Info */}
         <div className="flex items-center w-[30%] min-w-[180px] px-4">
            {/* Album Art */}
            <div className="w-14 h-14 bg-neutral-800 mr-4 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative group">
               <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-800">
                  {current.thumbnailUrl ? (
                     <img src={current.thumbnailUrl} width={56} height={56} alt="Album Art" />
                  ) : (
                     <MusicIcon className="w-6 h-6" />
                  )}
               </div>
            </div>
            {/* Track Title & Artists */}
            <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-medium hover:underline cursor-pointer truncate text-text">{current.title}</span>
               <div className="truncate text-text-subtle">
                  {current.artists.map((a, index) => (
                     <span key={a.id}>
                        <span
                           className="text-xs hover:underline cursor-pointer truncate hover:text-text transition-colors"
                           onClick={(e) => {
                              if (e.ctrlKey) {
                                 if (a.spotifyId)
                                    vanillaTrpc.system.openExternalLink.mutate(`https://open.spotify.com/artist/${a.spotifyId}`)
                                 if (a.ytChannelId)
                                    vanillaTrpc.system.openExternalLink.mutate(`https://www.youtube.com/channel/${a.ytChannelId}`)
                              }
                           }}
                        >
                           {a.name}
                        </span>
                        {index < current.artists.length - 1 && ', '}
                     </span>
                  ))}
               </div>
            </div>
            {/* <button className="ml-4 text-text-subtle hover:text-text transition-colors">
               <HeartIcon className="w-4 h-4" />
            </button> */}
         </div>

         {/* Center: Controls */}
         <div className="flex flex-col items-center max-w-[40%] w-full">
            <div className="flex items-center gap-6 mb-2">
               <button
                  className={twMerge('text-text-subtle hover:text-text transition-colors', randomType && 'text-accent')}
                  title="Shuffle"
                  onClick={() => updateState({ randomType: randomType === 'true' ? null : 'true' })}
               >
                  <span className="text-[10px]">{randomType}</span>
                  <ShuffleIcon className="w-4 h-4" />
               </button>
               <button className="text-text-subtle hover:text-text transition-colors" title="Previous" onClick={back}>
                  <SkipBackIcon className="w-5 h-5" />
               </button>
               <button
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform text-black"
                  onClick={toggle}
               >
                  {isPlaying ? (
                     <PauseIcon className="w-5 h-5 fill-current" />
                  ) : (
                     <PlayIcon className="w-5 h-5 fill-current translate-x-0.5" />
                  )}
               </button>
               <button className="text-text-subtle hover:text-text transition-colors" title="Next" onClick={() => next()}>
                  <SkipForwardIcon className="w-5 h-5" />
               </button>
               <button className="text-text-subtle hover:text-text transition-colors" title="Repeat">
                  <RepeatIcon className="w-4 h-4" />
               </button>
            </div>
            {mode === 'iframe' && <PlayerTrackProgress />}
            {mode === 'shaka' && <ShakaPlayerBarTrackProgress />}
         </div>

         {/* Right: Volume & Extra */}
         <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-3">
            <button className="text-text-subtle hover:text-text transition-colors">
               <Mic2Icon className="w-4 h-4" />
            </button>
            <button className="text-text-subtle hover:text-text transition-colors">
               <ListMusicIcon className="w-4 h-4" />
            </button>
            <button className="text-text-subtle hover:text-text transition-colors size-4">
               <MonitorSpeakerIcon className="w-4 h-4" />
            </button>
            {/* {playerRef && <PlayerVolume />} */}
            {/* {videoRef && <ShakaPlayerBarVolume />} */}
            <PlayerBarVolume />
         </div>
      </div>
   )
}
