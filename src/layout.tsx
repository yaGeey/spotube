import { NavLink, Outlet } from 'react-router-dom'
import Player from './components/Player'
import Header from './components/Header'
import Playlists from './components/nav/Playlists'
import { ToastContainer } from 'react-toastify'

export default function Layout() {
   return (
      <div className="pb-[90px] text-text text-sm">
         {/* <Header /> */}
         <nav className="flex gap-2 w-full bg-pink-200/40 px-4 fixed top-0 left-0 h-5">
            {/* end - exact path */}
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Home
            </NavLink>
            <NavLink to="/auth" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Auth
            </NavLink>
            <NavLink to="/test" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Test youtubei
            </NavLink>
            <NavLink to="/auth-genius" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               AuthGenius
            </NavLink>
         </nav>
         <div className="mt-5 flex">
            <Playlists />
            <div className="flex-1 pr-[320px]">
               <Outlet />
            </div>
         </div>
         <Player />
         <ToastContainer position="top-right" newestOnTop pauseOnHover />
      </div>
   )
}
