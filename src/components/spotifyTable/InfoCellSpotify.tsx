import { twMerge } from 'tailwind-merge'
import { MusicIcon } from '../Icons'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { useContext } from 'react'
import { CellContext } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { TableSpotifyFilterContext } from './TableSpotifyContext'
import { SpotifyTrack } from './TableSpotify'

export default function InfoCellSpotify({ info }: { info: CellContext<SpotifyTrack, unknown> }) {
   const navigate = useNavigate()
   const current = useAudioStore((state) => state.current)

   const t = info.row.original
   const isPlaying = current?.id === t.id && current.source === 'SPOTIFY'
   const thumbnailUrl = 'album' in t && t.album ? (t.album.images[0]?.url ?? null) : null

   const filters = useContext(TableSpotifyFilterContext)
   const currentFilter = filters.find((f) => f.id === 'info')
   const filterValue = (currentFilter?.value ?? []) as string[]

   return (
      <div className="py-1.5 max-w-[350px]">
         <div className="flex items-center gap-3">
            {/* Album Art */}
            <div className="size-10 bg-neutral-800 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative">
               {thumbnailUrl ? (
                  <img
                     src={thumbnailUrl}
                     alt="Art"
                     loading="lazy"
                     decoding="async"
                     className="w-full h-full object-cover transform-gpu"
                  />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                     <MusicIcon className="w-5 h-5" />
                  </div>
               )}
            </div>

            {/* Text Info */}
            <div className="flex flex-col overflow-hidden mr-4">
               <span
                  // onClick={handleNavigateToAI}
                  className={twMerge(
                     'text-text font-medium hover:underline cursor-pointer truncate text-sm md:text-base',
                     isPlaying && 'text-accent',
                  )}
               >
                  <span>{t.name}</span>
               </span>

               <div
                  className="text-xs text-text-subtle cursor-pointer truncate transition-colors"
                  onClick={(e) => {
                     e.stopPropagation()
                     // TODO
                     // if (!t.yt || t.yt.length === 0) return
                  }}
               >
                  {t.artists.map((a, index) => {
                     const isActive = filterValue.includes(a.name)
                     return (
                        <span key={a.id}>
                           <span
                              onClick={(e) => {
                                 e.stopPropagation()
                                 if (e.ctrlKey) navigate(`/spotify/artist?id=${a.id}`)
                                 else {
                                    if (isActive) {
                                       const newFilter = filterValue?.filter((p) => p !== a.name)
                                       info.column.setFilterValue(newFilter)
                                    } else {
                                       info.column.setFilterValue([...(filterValue ?? []), a.name])
                                    }
                                 }
                              }}
                              className={twMerge(
                                 'cursor-pointer hover:text-white transition-colors hover:underline',
                                 isActive && 'text-green-400 font-bold underline',
                              )}
                           >
                              {a.name}
                           </span>

                           {index < t.artists.length - 1 && ', '}
                        </span>
                     )
                  })}
               </div>
            </div>
         </div>
      </div>
   )
}
