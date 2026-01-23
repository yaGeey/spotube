import { NavLink, Outlet } from 'react-router-dom'
import Player from './components/Player'
import Header from './components/Header'
import Playlists from './components/nav/Playlists'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useEffect } from 'react'
import { useAudioStore } from './audio_store/useAudioStore'
import { GlobalPlayerController } from './components/GlobalVideoContainer'

export default function Layout() {
   useEffect(() => {
      // const init = async () => await useAudioStore.getState().initAdapter('iframe')
      // init()
      useAudioStore.getState().updateState({ mode: 'iframe' })
   }, [])
   return (
      <div className="pb-[90px] text-text text-sm">
         <GlobalPlayerController />
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
