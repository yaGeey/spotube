import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { trpc } from '@/src/utils/trpc'
import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { MusicIcon } from '../Icons'

const Playlists = () => {
   const { clearHistory } = useAudioStore()
   const playlists = trpc.playlists.getAll.useQuery()
   const deleteSpotifyPlaylist = trpc.spotify.deletePlaylist.useMutation()
   const deleteYoutubePlaylist = trpc.yt.deletePlaylist.useMutation()

   return (
      <nav className="w-25 bg-main">
         <div className="fixed w-25">
            {playlists.data?.map((pl) => (
               <NavLink
                  to={`/${pl.id}`}
                  key={pl.id}
                  className={({ isActive }) => twMerge('hover:text-lighter', isActive && 'text-lighter')}
                  onClick={() => clearHistory()}
                  onContextMenu={(e) => {
                     e.preventDefault()
                     if (confirm('Delete this playlist from the app?')) {
                        if (pl.origin === 'SPOTIFY') deleteSpotifyPlaylist.mutate(pl.spotifyMetadataId!)
                        else if (pl.origin === 'YOUTUBE') deleteYoutubePlaylist.mutate(pl.youtubeMetadataId!)
                     }
                  }}
               >
                  {pl.title}
                  {pl.thumbnailUrl ? (
                     <img src={pl.thumbnailUrl} width={56} height={56} alt={pl.title} />
                  ) : (
                     <MusicIcon className="w-6 h-6" />
                  )}
               </NavLink>
            ))}
         </div>
      </nav>
   )
}

export default Playlists
