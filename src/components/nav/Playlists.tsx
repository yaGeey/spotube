import { useAudioStore } from '@/src/audio_store/useAudioStore'
import { trpc } from '@/src/utils/trpc'
import React from 'react'
import { NavLink, NavLinkProps } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { MusicIcon } from '../Icons'
import useContextMenu from '@/src/hooks/useContextMenu'
import ContextMenu from '../ContextMenu'
import { PlaylistWithItems } from '@/electron/lib/prisma'
import { CombinedPlaylist } from '@/generated/prisma/client'
import SwitchDiv from './SwitchDiv'

export type PlaylistType = 'local' | 'spotify' | 'youtube' | 'combined'
const Playlists = () => {
   const { handleContextMenu, left, top, isOpen } = useContextMenu()
   const [menuItems, setMenuItems] = React.useState<{ name: string; function: () => void }[]>([])

   const playlists = trpc.playlists.getAll.useQuery()
   const combPlaylists = trpc.combinedPlaylists.getAll.useQuery()
   const onlinePlaylists = trpc.spotifyUser.getPlaylists.useQuery()

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

   const [selected, setSelected] = React.useState<PlaylistType>('local')
   return (
      <nav className="w-25 bg-main">
         {isOpen && <ContextMenu items={menuItems} top={top} left={left} />}
         <div className="fixed w-25">
            <SwitchDiv
               activeId={selected}
               items={[
                  {
                     text: 'local',
                     fn: () => setSelected('local'),
                  },
                  {
                     text: 'spotify',
                     fn: () => setSelected('spotify'),
                  },
               ]}
            />

            {selected === 'spotify' &&
               onlinePlaylists.data?.map((pl) => (
                  <PlaylistItem
                     key={pl.id + 'spotify'}
                     title={pl.name}
                     to={`/${pl.id}?type=spotify`}
                     thumbnailUrl={pl.images[0]?.url}
                  />
               ))}

            {selected === 'local' &&
               playlists.data?.map((pl) => (
                  <PlaylistItem
                     key={pl.id + 'local'}
                     title={pl.title}
                     to={`/${pl.id}?type=local`}
                     thumbnailUrl={pl.thumbnailUrl}
                     props={{
                        onContextMenu: (e) => {
                           getContextMenuItems(pl)
                           handleContextMenu(e)
                        },
                     }}
                  />
               ))}

            {selected === 'local' &&
               combPlaylists.data?.map((pl) => (
                  <PlaylistItem
                     key={pl.id + 'combined'}
                     title={pl.title}
                     to={`/${pl.id}?type=combined`}
                     thumbnailUrl={pl.thumbnailUrl}
                     props={{
                        onContextMenu: (e) => {
                           getContextMenuItemsForCombined(pl)
                           handleContextMenu(e)
                        },
                     }}
                  />
               ))}
         </div>
      </nav>
   )
}

export default Playlists

const PlaylistItem = ({
   title,
   to,
   thumbnailUrl,
   ...props
}: {
   title: string
   to: string
   thumbnailUrl?: string | null
   props?: Partial<NavLinkProps>
}) => {
   return (
      <NavLink
         to={to}
         className={({ isActive }) => twMerge('hover:text-accent', isActive && 'text-accent')}
         onClick={() => useAudioStore.getState().clearHistory()}
         {...props}
      >
         {title}
         {thumbnailUrl ? <img src={thumbnailUrl} width={56} height={56} alt={title} /> : <MusicIcon className="w-6 h-6" />}
      </NavLink>
   )
}
