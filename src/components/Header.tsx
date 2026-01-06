import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Header() {
   const navigate = useNavigate()
   const [searchQuery, setSearchQuery] = useState('')

   return (
      <header className="sticky top-0 z-50 bg-main">
         <div className="flex items-center justify-between px-6 py-1">
            {/* Navigation Arrows */}
            <div className="flex items-center gap-2">
               <button
                  onClick={() => navigate(-1)}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
                  aria-label="Go back"
               >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
               </button>
               <button
                  onClick={() => navigate(1)}
                  className="w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
                  aria-label="Go forward"
               >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
               </button>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
               <div className="relative">
                  <svg
                     className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
                     fill="none"
                     viewBox="0 0 24 24"
                     stroke="currentColor"
                  >
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="What do you want to listen to?"
                     className="text-sm w-full bg-white/10 hover:bg-white/15 text-white placeholder-neutral-400 rounded-full py-1.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
                  />
                  {searchQuery && (
                     <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                        aria-label="Clear search"
                     >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                     </button>
                  )}
               </div>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
               <button className="px-6 py-2 text-sm font-semibold text-neutral-400 hover:text-white hover:scale-105 transition-all whitespace-nowrap">
                  Sign up
               </button>
               <button className="px-8 py-3 text-sm font-semibold bg-white text-black rounded-full hover:scale-105 transition-transform whitespace-nowrap">
                  Log in
               </button>
            </div>
         </div>
      </header>
   )
}
