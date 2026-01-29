import { NavLink, Outlet } from 'react-router-dom'
import Player from './components/Player'
import Playlists from './components/nav/Playlists'
import { ToastContainer } from 'react-toastify'
import Info from './components/nav/Info'
import AbsoluteVideoContainer from './components/player/AbsoluteVideoContainer'

const className = ({ isActive, isPending }: { isActive: boolean; isPending: boolean }) =>
   isActive ? 'text-blue-400 font-semibold' : ''

export default function Layout() {
   return (
      <div className="text-text text-sm">
         <AbsoluteVideoContainer />
         {/* <Header /> */}
         <nav className="flex gap-2 w-full bg-pink-200/40 px-4 fixed top-0 left-0 h-5">
            {/* end - exact path */}
            <NavLink to="/" end className={className}>
               Home
            </NavLink>
            <NavLink to="/auth" end className={className}>
               Auth
            </NavLink>
            <NavLink to="/test" end className={className}>
               Test youtubei
            </NavLink>
            <NavLink to="/auth-genius" end className={className}>
               AuthGenius
            </NavLink>
            <NavLink to="/spotify/artist?id=0685luDRQZRkN4JnhnRSKX" end className={className}>
               Artist test
            </NavLink>
            <NavLink to="/spotify/search?q=wotaku" end className={className}>
               Artist test
            </NavLink>
         </nav>
         {/* TODO pb when current only (playerbar shown) */}
         <div className="mt-5 flex pb-[90px]">
            <Playlists />
            <div className="flex-1 pr-[320px]">
               <Outlet />
            </div>
            <Info />
         </div>
         <Player />
         <ToastContainer
            position="top-right"
            newestOnTop
            pauseOnHover // Глобальні класи для контейнера самого повідомлення
            // toastClassName="bg-gray-900 text-white shadow-xl rounded-lg border border-gray-700"
            // // Класи для тексту всередині
            // className="text-sm font-medium text-black"
            // // Класи для прогрес-бару
            // progressClassName="bg-blue-500 h-1"
            // className="shadow-lg overflow-visible scale-100 ring-1 ring-black/5 rounded-xl flex items-center gap-6 bg-slate-800 highlight-white/5"
         />
      </div>
   )
}
