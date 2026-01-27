import { twMerge } from 'tailwind-merge'
import InfoIcon from './InfoIcon'
import { MusicIcon } from '../Icons'
import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { useContext } from 'react'
import { TableFiltersContext } from './TableContext'
import { PlaylistItemWithRelations } from '@/electron/lib/prisma'
import { CellContext } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'

export default function InfoCell({
   userScripts,
   info,
}: {
   userScripts: string[]
   info: CellContext<PlaylistItemWithRelations, unknown>
}) {
   const navigate = useNavigate()
   const current = useAudioStore((state) => state.current)

   const t = info.row.original.track
   const isPlaying = !!(current?.yt?.[0]?.id && current.yt[0].id === t.yt?.[0]?.id)
   const showLatin = t.titleLatin && t.script && !userScripts.includes(t.script)

   const filters = useContext(TableFiltersContext)
   const currentFilter = filters.find((f) => f.id === 'info')
   const filterValue = (currentFilter?.value ?? []) as string[]

   return (
      <div className="py-1.5 max-w-[350px]">
         <div className="flex items-center gap-3">
            {/* Album Art */}
            <div className="size-10 bg-neutral-800 rounded-md flex-shrink-0 overflow-hidden shadow-lg relative">
               {t.thumbnailUrl ? (
                  <img
                     src={t.thumbnailUrl}
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
                  <span className={showLatin ? 'group-hover:hidden' : ''}>{t.title}</span>
                  {showLatin && <span className="hidden group-hover:inline">{t.titleLatin}</span>}
                  <InfoIcon data={t.lastFM?.track?.wiki?.content} />
               </span>

               <div
                  className="text-xs text-text-subtle cursor-pointer truncate transition-colors"
                  onClick={(e) => {
                     e.stopPropagation()
                     if (!t.yt || t.yt.length === 0) return
                  }}
               >
                  {t.artists.map((a, index) => {
                     const isActive = filterValue.includes(a.name) || (a.latinName && filterValue.includes(a.latinName))
                     const showLatin = a.latinName && a.script && !userScripts.includes(a.script)
                     return (
                        <span key={a.name + index + a.latinName}>
                           <span
                              onClick={(e) => {
                                 e.stopPropagation()
                                 if (e.ctrlKey) navigate(`/spotify/artist?id=${a.spotifyId}`)
                                 else {
                                    if (isActive) {
                                       const newFilter = filterValue?.filter((p) => p !== a.name && p !== a.latinName)
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
                              <span className={showLatin ? 'group-hover:hidden' : ''}>{a.name}</span>
                              {showLatin && <span className="hidden group-hover:inline">{a.latinName}</span>}
                              <InfoIcon data={a.lastFM?.bio?.content} />
                           </span>

                           {index < t.artists.length - 1 && ', '}
                        </span>
                     )
                  })}
                  <InfoIcon data={t.lastFM?.album?.wiki?.content} />
               </div>
            </div>
         </div>
      </div>
   )
}
