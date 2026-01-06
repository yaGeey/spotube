import { NavLink, Outlet } from 'react-router-dom'
import Player from './components/Player'
import Header from './components/Header'

export default function Layout() {
   return (
      <div className="pb-[90px] bg-main/95 text-text text-sm">
         <Header />
         <nav className="flex gap-2 w-full bg-pink-200/40 px-4">
            {/* end - exact path */}
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Home
            </NavLink>
            <NavLink to="/auth" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Auth
            </NavLink>
            <NavLink to="/test" end className={({ isActive }) => (isActive ? 'text-blue-400 font-semibold' : '')}>
               Test
            </NavLink>
         </nav>
         <main className="p-4">
            <Outlet />
         </main>
         <Player />
      </div>
   )
}
