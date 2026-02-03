import { trpc, vanillaTrpc } from '../utils/trpc'
import { toast } from 'react-toastify'
import { clsx } from 'clsx'
import { toastOptions } from '@/utils/toast'
import { ViewTrackModel } from '../utils/currentTrackAdapters'
import { useNavigate } from 'react-router-dom'
import Loading from './icons/Loading'

export default function TrackInfo({ data }: { data: ViewTrackModel }) {
   const navigate = useNavigate()
   // TODO fetch for all
   const { data: fetchedData, isFetching } = trpc.lastfm.getDataForCurrent.useQuery(data, {
      enabled: data.source === 'SPOTIFY',
   })
   const lastFm = fetchedData || {
      artists: data.artists.map((a) => a.lastFM).filter((a) => a !== null) ?? [data.lastFM?.artist].filter((a) => a !== null),
      track: data.lastFM?.track ?? null,
      album: data.lastFM?.album ?? null,
   }
   if (!lastFm && !isFetching) return null
   return (
      <div className="flex flex-col gap-6 max-w-full h-full overflow-y-auto">
         {isFetching && (
            <div className="w-full h-screen flex items-center justify-center">
               <Loading />
            </div>
         )}
         {/* --- TRACK CARD (Blue Accent) --- */}
         {lastFm?.track?.wiki?.content && (
            <div className="relative group rounded-lg bg-blue-500/5 border-l-4 border-blue-500/50 p-3 transition-colors hover:bg-blue-500/10">
               <span className="absolute right-2 top-1.5 z-100 text-[10px] font-bold uppercase tracking-widest text-blue-400/50 pointer-events-none">
                  Track
               </span>
               <InfoSection title={data.title} content={lastFm.track.wiki.content} headerClassName="text-blue-200" />
               <Tags tags={lastFm.track.toptags.tag} />
            </div>
         )}

         {/* --- ARTISTS LIST (Purple Accent) --- */}
         <div className="flex flex-col gap-4">
            {lastFm.artists
               .filter((a) => a.bio?.content)
               .map((artist, i) => (
                  <div
                     key={artist.url}
                     className="relative rounded-lg bg-purple-500/5 border-l-4 border-purple-500/50 p-3 transition-colors hover:bg-purple-500/10"
                  >
                     <span className="absolute right-2 top-1.5 z-100 text-[10px] font-bold uppercase tracking-widest text-purple-400/50 pointer-events-none">
                        Artist #{i + 1}
                     </span>

                     <InfoSection title={artist.name} content={artist.bio?.content} headerClassName="text-purple-200" />

                     {/* Tags inside the card context */}
                     <div className="mt-2">
                        <Tags tags={artist.tags.tag} />
                     </div>

                     {/* SIMILAR ARTISTS */}
                     {artist.similar?.artist && artist.similar.artist.length > 0 && (
                        <div className="mt-4 pl-3 border-l-2 border-purple-500/20">
                           <h3 className="text-[10px] font-bold text-purple-400/70 mb-2 uppercase tracking-wider">
                              Similar Artists
                           </h3>
                           <div className="flex flex-wrap gap-2">
                              {artist.similar.artist.map((sim) => (
                                 <span
                                    key={sim.name}
                                    className="text-sm text-text hover:text-purple-300 transition-colors cursor-default hover:underline"
                                    onClick={(e) => {
                                       if (e.ctrlKey) vanillaTrpc.system.openExternalLink.mutate(sim.url)
                                       else navigate(`/spotify/search?type=artist&q=${encodeURIComponent(sim.name)}`)
                                    }}
                                 >
                                    {sim.name}
                                 </span>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               ))}
         </div>

         {/* --- ALBUM CARD (Amber Accent) --- */}
         {lastFm?.album?.wiki?.content && (
            <div className="relative rounded-lg bg-amber-500/5 border-l-4 border-amber-500/50 p-3 transition-colors hover:bg-amber-500/10">
               <span className="absolute right-2 top-1.5 z-100 text-[10px] font-bold uppercase tracking-widest text-amber-400/50 pointer-events-none">
                  Album
               </span>
               <InfoSection title={lastFm.album.name} content={lastFm.album.wiki.content} headerClassName="text-amber-200" />
               <Tags tags={lastFm.album.tags.tag} />
            </div>
         )}
      </div>
   )
}

function InfoSection({
   title,
   content,
   defaultOpen = false,
   headerClassName,
}: {
   title: React.ReactNode
   content?: string
   defaultOpen?: boolean
   headerClassName?: string
}) {
   return (
      <details className="group" open={defaultOpen}>
         <summary className="sticky top-0 z-10 list-none flex items-center justify-between cursor-pointer py-1 select-none backdrop-blur-md rounded-lg px-1 -mx-1">
            <span
               className={clsx(
                  'text-lg font-semibold transition-colors duration-200',
                  headerClassName || 'text-text group-hover:text-primary',
               )}
            >
               {title}
            </span>
            {content?.trim() && (
               <span className="text-text-subtle transition-transform duration-300 group-open:rotate-180">▼</span>
            )}
         </summary>

         {content?.trim() && (
            <div className="overflow-x-hidden mt-3 text-text-subtle text-sm leading-relaxed text-balance whitespace-pre-line animate-in fade-in slide-in-from-top-1 duration-300 px-1">
               {content}
            </div>
         )}
      </details>
   )
}

function Tags({ tags }: { tags: PrismaJson.LastFMArtist['tags']['tag'] | undefined }) {
   if (!tags || tags.length === 0) return null
   const safeTags = Array.isArray(tags) ? tags : [tags]

   return (
      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-white/5 px-1 pb-1">
         {safeTags.map((tag) => (
            <span
               key={tag.name}
               className={clsx(
                  'px-2 py-0.5 rounded-full text-sm transition-all duration-200 border border-transparent no-jump',
                  // Зробив фон тегів трохи темнішим (black/20), щоб він контрастував з кольоровим фоном картки
                  'bg-black/20 text-text-subtle',
                  'hover:bg-black/40 hover:text-text hover:scale-105',
                  'cursor-pointer select-none',
               )}
               onClick={(e) => {
                  e.stopPropagation()
                  if (e.ctrlKey) {
                     vanillaTrpc.system.openExternalLink.mutate(tag.url)
                  } else {
                     toast.warn('Hold Ctrl + Click to open tag link', toastOptions)
                  }
               }}
               title="Ctrl + Click to open"
            >
               {tag.name}
            </span>
         ))}
      </div>
   )
}
