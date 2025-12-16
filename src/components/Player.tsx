import React, { useEffect, useState } from 'react'
import { useAudioStore } from '../hooks/useAudioStore'
import { formatDuration } from '../utils/time'

export default function Player() {
   const { current, toggle, playerRef, isPlaying, next, back } = useAudioStore()
   const [volume, setVolume] = useState<number>(playerRef ? playerRef.getVolume() : 50)

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

   const image = current?.spotify?.track.images[0] ?? current?.yt?.[0].full_response.snippet?.thumbnails?.standard
   const { width, height, url } = image || {}

   if (!current || !playerRef) return null
   return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center justify-between text-white h-[90px] z-50">
         {/* Left: Track Info */}
         <div className="flex items-center w-[30%] min-w-[180px]">
            <div className="w-14 h-14 bg-neutral-800 mr-4 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative group">
               {/* Album Art Placeholder */}
               <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-800">
                  {image ? <img src={url!} width={width!} height={height!} alt="Album Art" /> : <MusicIcon className="w-6 h-6" />}
               </div>
            </div>
            <div className="flex flex-col overflow-hidden">
               <span className="text-sm font-medium hover:underline cursor-pointer truncate text-white">
                  {current?.spotify?.track.name ?? current?.yt?.[0].title}
               </span>
               <span className="text-xs text-neutral-400 hover:underline cursor-pointer truncate hover:text-white transition-colors">
                  {current?.spotify?.track.artists.map((a) => a.name).join(', ') ?? current?.yt?.[0].artist}
               </span>
            </div>
            <button className="ml-4 text-neutral-400 hover:text-white transition-colors">
               <HeartIcon className="w-4 h-4" />
            </button>
         </div>

         {/* Center: Controls */}
         <div className="flex flex-col items-center max-w-[40%] w-full">
            <div className="flex items-center gap-6 mb-2">
               <button className="text-neutral-400 hover:text-white transition-colors" title="Shuffle">
                  <ShuffleIcon className="w-4 h-4" />
               </button>
               <button className="text-neutral-400 hover:text-white transition-colors" title="Previous" onClick={back}>
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
               <button className="text-neutral-400 hover:text-white transition-colors" title="Next" onClick={next}>
                  <SkipForwardIcon className="w-5 h-5" />
               </button>
               <button className="text-neutral-400 hover:text-white transition-colors" title="Repeat">
                  <RepeatIcon className="w-4 h-4" />
               </button>
            </div>
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
         </div>

         {/* Right: Volume & Extra */}
         <div className="flex items-center justify-end w-[30%] min-w-[180px] gap-3">
            <button className="text-neutral-400 hover:text-white transition-colors">
               <Mic2Icon className="w-4 h-4" />
            </button>
            <button className="text-neutral-400 hover:text-white transition-colors">
               <ListMusicIcon className="w-4 h-4" />
            </button>
            <button className="text-neutral-400 hover:text-white transition-colors">
               <MonitorSpeakerIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 w-24 group">
               <Volume2Icon
                  className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors"
                  onClick={() => {
                     playerRef.isMuted ? playerRef.unMute() : playerRef.mute()
                  }}
               />
               <div className="h-1 bg-neutral-600 rounded-full w-full relative cursor-pointer">
                  <div
                     className="absolute top-0 left-0 h-full bg-white rounded-full group-hover:bg-green-500 transition-colors"
                     style={{ width: `${volume}%` }}
                  ></div>
               </div>
            </div>
         </div>
      </div>
   )
}

// Icons
function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
   )
}

function PauseIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <rect x="6" y="4" width="4" height="16" />
         <rect x="14" y="4" width="4" height="16" />
      </svg>
   )
}

function SkipBackIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <polygon points="19 20 9 12 19 4 19 20" />
         <line x1="5" x2="5" y1="19" y2="5" />
      </svg>
   )
}

function SkipForwardIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <polygon points="5 4 15 12 5 20 5 4" />
         <line x1="19" x2="19" y1="5" y2="19" />
      </svg>
   )
}

function ShuffleIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l9.6-12.6c.8-1.1 2-1.7 3.3-1.7H22" />
         <path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l9.6 12.6c.8 1.1 2 1.7 3.3 1.7H22" />
      </svg>
   )
}

function RepeatIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="m17 2 4 4-4 4" />
         <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
         <path d="m7 22-4-4 4-4" />
         <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
   )
}

function Volume2Icon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
         <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
   )
}

function HeartIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
   )
}

function Mic2Icon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12" />
         <circle cx="17" cy="7" r="5" />
      </svg>
   )
}

function ListMusicIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="M21 15V6" />
         <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
         <path d="M12 12H3" />
         <path d="M16 6H3" />
         <path d="M12 18H3" />
      </svg>
   )
}

function MonitorSpeakerIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="M5.5 20H8" />
         <path d="M17 9h.01" />
         <rect width="10" height="16" x="12" y="4" rx="2" />
         <path d="M8 6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4" />
         <circle cx="17" cy="15" r="1" />
      </svg>
   )
}

function MusicIcon(props: React.SVGProps<SVGSVGElement>) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         {...props}
      >
         <path d="M9 18V5l12-2v13" />
         <circle cx="6" cy="18" r="3" />
         <circle cx="18" cy="16" r="3" />
      </svg>
   )
}
