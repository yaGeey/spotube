import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faXmark, faPlay } from '@fortawesome/free-solid-svg-icons'
import { trpc } from '../../utils/trpc'

const SpotifySearch = () => {
   const [searchParams, setSearchParams] = useSearchParams()
   const navigate = useNavigate()

   // Отримуємо початкове значення з URL або порожній рядок
   const initialQuery = searchParams.get('q') || ''
   const [inputValue, setInputValue] = useState(initialQuery)

   // Стан для значення, яке відправляється на сервер (з затримкою)
   const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

   // Ефект для Debounce: оновлюємо запит і URL через 500мс після зупинки вводу
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedQuery(inputValue)
         if (inputValue.trim()) {
            setSearchParams({ q: inputValue })
         } else {
            setSearchParams({})
         }
      }, 500)

      return () => clearTimeout(timer)
   }, [inputValue, setSearchParams])

   // Виконуємо запит tRPC тільки якщо є query
   const { data: artists, isLoading } = trpc.spotify.searchArtists.useQuery(debouncedQuery, {
      enabled: !!debouncedQuery && debouncedQuery.length > 0,
   })

   const clearSearch = () => {
      setInputValue('')
      setDebouncedQuery('')
      setSearchParams({})
   }

   // Обробник кліку по картці (перехід на сторінку артиста)
   const handleArtistClick = (artistId: string) => {
      navigate(`/artist?id=${artistId}`)
   }

   return (
      <div className="min-h-screen bg-main text-text font-sans pb-24 overflow-x-hidden">
         {/* Search Header (Sticky) */}
         <div className="sticky top-0 z-30 bg-main/95 backdrop-blur-md px-8 py-6 flex items-center gap-4">
            <div className="relative w-full max-w-[400px]">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-subtle">
                  <FontAwesomeIcon icon={faSearch} className="text-lg" />
               </div>
               <input
                  type="text"
                  className="w-full bg-main-lighter text-text placeholder-text-subtle rounded-full py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium text-sm truncate"
                  placeholder="What do you want to listen to?"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  autoFocus
               />
               {inputValue && (
                  <button
                     onClick={clearSearch}
                     className="absolute inset-y-0 right-3 flex items-center text-text-subtle hover:text-text"
                  >
                     <FontAwesomeIcon icon={faXmark} className="text-lg" />
                  </button>
               )}
            </div>
         </div>

         {/* Content Area */}
         <div className="px-8 mt-4 max-w-[1920px] mx-auto">
            {!debouncedQuery ? (
               /* Empty State */
               <div className="flex flex-col items-center justify-center h-[50vh] text-text">
                  <h2 className="text-2xl font-bold mb-2">Search for artists</h2>
                  <p className="text-text-subtle">Find your favorite artists and music.</p>
               </div>
            ) : isLoading ? (
               /* Loading State */
               <div className="flex items-center justify-center h-[50vh] text-text-subtle">
                  <span>Loading...</span>
               </div>
            ) : artists && artists.length > 0 ? (
               /* Results Grid */
               <section>
                  <h2 className="text-2xl font-bold mb-6 text-text">Artists</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                     {artists.map((artist: any) => (
                        <Link
                           to={`/spotify/artist?id=${artist.id}`}
                           key={artist.id}
                           onClick={() => handleArtistClick(artist.id)}
                           className="p-4 bg-[#181818] hover:bg-[#282828] rounded-lg transition-all duration-300 group cursor-pointer relative"
                        >
                           <div className="relative mb-4 aspect-square">
                              <img
                                 src={artist.images?.[0]?.url || 'https://via.placeholder.com/300x300/333/fff?text=No+Image'} // Fallback placeholder
                                 alt={artist.name}
                                 className="w-full h-full object-cover rounded-full shadow-lg"
                              />
                              {/* Hover Play Button */}
                              <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl z-10">
                                 <button className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-main hover:scale-105 transition-transform shadow-md">
                                    <FontAwesomeIcon icon={faPlay} className="text-xl ml-1" />
                                 </button>
                              </div>
                           </div>

                           <div className="flex flex-col gap-1">
                              <h3 className="font-bold truncate text-text text-base" title={artist.name}>
                                 {artist.name}
                              </h3>
                              <p className="text-sm text-text-subtle capitalize">Artist</p>
                           </div>
                        </Link>
                     ))}
                  </div>
               </section>
            ) : (
               /* No Results State */
               <div className="flex flex-col items-center justify-center h-[40vh] text-text">
                  <p className="text-xl font-bold">No results found for {debouncedQuery}</p>
                  <p className="text-text-subtle mt-2">
                     Please make sure your words are spelled correctly or use fewer keywords.
                  </p>
               </div>
            )}
         </div>
      </div>
   )
}

export default SpotifySearch
