import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { trpc } from '@/src/utils/trpc'
import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { MusicIcon } from '../Icons'
import useContextMenu from '@/src/hooks/useContextMenu'
import ContextMenu from '../ContextMenu'
import { PlaylistWithItems } from '@/electron/lib/prisma'
import { CombinedPlaylist } from '@/generated/prisma/client'

const Playlists = () => {
   const { handleContextMenu, left, top, isOpen } = useContextMenu()
   const [menuItems, setMenuItems] = React.useState<{ name: string; function: () => void }[]>([])

   const clearHistory = useAudioStore((state) => state.clearHistory)
   const playlists = trpc.playlists.getAll.useQuery()
   const combPlaylists = trpc.combinedPlaylists.getAll.useQuery()
   const deleteSpotifyPlaylist = trpc.spotify.deletePlaylist.useMutation()
   const deleteYoutubePlaylist = trpc.yt.deletePlaylist.useMutation()
   const deleteCombined = trpc.combinedPlaylists.delete.useMutation()
   const deleteLocal = trpc.playlists.deleteLocal.useMutation()
   const covertToLocalAsNew = trpc.playlists.covertToLocalAsNew.useMutation()

   const utils = trpc.useUtils()
   const onSuccess = () => {
      utils.playlists.getAll.invalidate()
      utils.combinedPlaylists.getAll.invalidate()
   }

   function getContextMenuItems(pl: PlaylistWithItems) {
      setMenuItems([
         {
            name: 'Delete playlist',
            function: () => {
               if (confirm('Delete this playlist from the app?')) {
                  if (pl.origin === 'SPOTIFY') deleteSpotifyPlaylist.mutate(pl.spotifyMetadataId!, { onSuccess })
                  else if (pl.origin === 'YOUTUBE') deleteYoutubePlaylist.mutate(pl.youtubeMetadataId!, { onSuccess })
                  else if (pl.origin === 'LOCAL') deleteLocal.mutate(pl.id, { onSuccess })
               }
            },
         },
         ...(pl.origin !== 'LOCAL'
            ? [
                 {
                    name: 'Add new local playlist with same tracks',
                    function: () => covertToLocalAsNew.mutate(pl.id, { onSuccess }),
                 },
                 {
                    name: 'Convert to local playlist',
                    function: () => {
                       confirm('This will disable sync with original playlist. Continue?') &&
                          covertToLocalAsNew.mutate(pl.id, { onSuccess })
                    },
                 },
              ]
            : []),
      ])
   }

   function getContextMenuItemsForCombined(pl: CombinedPlaylist) {
      setMenuItems([
         {
            name: 'Delete combined playlist',
            function: () => confirm('Delete this combined playlist from the app?') && deleteCombined.mutate(pl.id, { onSuccess }),
         },
      ])
   }

   return (
      <nav className="w-25 bg-main">
         {isOpen && <ContextMenu items={menuItems} top={top} left={left} />}
         <div className="fixed w-25">
            {playlists.data?.map((pl) => (
               <NavLink
                  to={`/${pl.id}`}
                  key={pl.id}
                  className={({ isActive }) =>
                     twMerge('hover:text-accent', isActive && 'text-accent', pl.origin === 'LOCAL' && 'italic')
                  }
                  onClick={() => clearHistory()}
                  onContextMenu={(e) => {
                     getContextMenuItems(pl)
                     handleContextMenu(e)
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

            {combPlaylists.data?.map((pl) => (
               <NavLink
                  to={`/${pl.id}?combined=true`}
                  key={pl.id + 'comb'}
                  className={({ isActive }) => twMerge('hover:text-accent', isActive && 'text-accent')}
                  onClick={() => clearHistory()}
                  onContextMenu={(e) => {
                     getContextMenuItemsForCombined(pl)
                     handleContextMenu(e)
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
