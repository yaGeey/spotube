import { useAudioStore } from '@/src/hooks/useAudioStore'
import { trpc } from '@/src/utils/trpc'
import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { MusicIcon } from '../Icons'

const Playlists = () => {
   const { clearHistory } = useAudioStore()
   const spotify = trpc.spotify.getPlaylists.useQuery()
   const yt = trpc.yt.getPlaylists.useQuery()
   const deleteSpotifyPlaylist = trpc.spotify.deletePlaylist.useMutation()

   return (
      <nav className="w-25 bg-main">
         <div className="fixed w-25">
            <h2>Spotify</h2>
            {spotify.data?.map((pl) => (
               <NavLink
                  to={`/${pl.id}`}
                  key={pl.id}
                  className={({ isActive }) => twMerge('hover:text-lighter', isActive && 'text-lighter')}
                  onClick={() => clearHistory()}
                  onContextMenu={(e) => {
                     e.preventDefault()
                     confirm('Delete this playlist from the app?') && deleteSpotifyPlaylist.mutate(pl.id)
                  }}
               >
                  {pl.title}
                  {pl.thumbnail_url ? (
                     <img src={pl.thumbnail_url} width={56} height={56} alt={pl.title} />
                  ) : (
                     <MusicIcon className="w-6 h-6" />
                  )}
               </NavLink>
            ))}
            <br />
            <h2>Youtube</h2>
            {yt.data?.map((pl) => (
               <div key={pl.id} className="text-white _hover:text-lighter">
                  {pl.title}
               </div>
            ))}
         </div>
      </nav>
   )
}

export default Playlists
