import React from 'react'
import Button from '../components/Button'
import { trpc } from '../utils/trpc'
import { MutateOptions } from '@tanstack/react-query'
import { toastOptions } from '@/utils/toast'
import { toast } from 'react-toastify'
import { useAudioStore } from '../audio_store/useAudioStore'

function Home() {
   const [inputValue, setInputValue] = React.useState('')
   const [ids, setIds] = React.useState<{ platform: 'yt' | 'spotify'; id: string }[]>([])
   const utils = trpc.useUtils()
   const spotifyPlaylist = trpc.spotify.upsertPlaylistWithTracks.useMutation()
   const ytPlaylist = trpc.yt.upsertPlaylistWithTracks.useMutation()
   const ytFromSpotify = trpc.yt.addVideosToMasterFromSpotifyBatch.useMutation()
   const createCombined = trpc.playlists.createCombined.useMutation()

   const mutationOptions = {
      onSuccess: () => {
         utils.playlists.getAll.refetch()
      },
   } satisfies MutateOptions

   const localPlaylist = trpc.playlists.createLocal.useMutation()

   function parseIdfromSpotifyUrl(url: string) {
      const parts = url.split('/')
      return parts[parts.length - 1].split('?')[0]
   }
   function parseIdfromYtUrl(url: string) {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('list')
   }

   function handleTestLocal() {
      localPlaylist.mutate({ title: 'Test Local Playlist', description: 'This is a test local playlist' })
      if (!localPlaylist.data) return
      utils.playlists.getAll.refetch()
   }

   function handleAddId(e: React.KeyboardEvent<HTMLInputElement>) {
      const url = (e.target as HTMLInputElement).value
      const platfrom = url.includes('youtube') ? 'yt' : url.includes('spotify') ? 'spotify' : null
      const id = platfrom === 'yt' ? parseIdfromYtUrl(url) : parseIdfromSpotifyUrl(url)
      if (!platfrom || !id) {
         alert('Invalid URL')
         return
      }
      setIds((p) => [...p, { platform: platfrom, id }])
   }

   async function handleCreatePlaylist() {
      if (ids.length === 0) return
      if (ids.length === 1) {
         if (ids[0].platform === 'yt') {
            ytPlaylist.mutate(ids[0].id, mutationOptions)
         } else {
            spotifyPlaylist.mutate(ids[0].id, mutationOptions)
         }
      } else {
         // Combined playlist
         const idsSet = new Set<string>(ids.map((i) => i.id))
         if (idsSet.size !== ids.length) {
            alert('Duplicate IDs found. Combined playlist requires unique IDs.')
            return
         }

         const responses = await Promise.all(
            ids.map(async (item) => {
               let playlistId: number | null = null
               if (item.platform === 'spotify') {
                  playlistId = (await spotifyPlaylist.mutateAsync(item.id)).id
               } else if (item.platform === 'yt') {
                  playlistId = (await ytPlaylist.mutateAsync(item.id)).id
               }
               if (!playlistId) throw new Error('Failed to create playlist')
               return { platform: item.platform, id: playlistId }
            }),
         )
         createCombined.mutate(
            {
               title: 'Combined Playlist',
               playlistIds: responses.map((r) => r.id),
            },
            mutationOptions,
         )
      }
   }

   return (
      <div className="space-y-2">
         <Button
            onClick={() => {
               toast.dismiss()
               toast('Succes', { autoClose: false })
               toast.info('Info', { autoClose: false })
               toast.success('Succes', { autoClose: false })
               toast.error('Error', { autoClose: false })
               toast.warn('Warn', { autoClose: false })
               toast.dark('Dark', { autoClose: false })
            }}
         >
            toasts
         </Button>
         <Button
            onClick={() => {
               // useAudioStore.getState().loadVideo('OiZVcLDhxG0') // why delay 4.8s?
               useAudioStore.getState().loadVideo('U6rv5qi8-8s')
            }}
         >
            Test global player
         </Button>
         <Button onClick={() => useAudioStore.getState().videoElement?.play()}>Resume play</Button>
         <ul>
            {ids.map((item) => (
               <li key={item.id} onClick={() => setIds((p) => p.filter((i) => i.id !== item.id))} className="cursor-pointer">
                  {item.platform}: {item.id}
               </li>
            ))}
         </ul>
         <input
            onKeyDown={(e) => {
               if (e.key === 'Enter') handleAddId(e)
            }}
            className="bg-white placeholder:text-black/50 text-black w-full py-0.5 px-2 rounded-md mt-2"
            placeholder="id"
         />
         <Button onClick={handleCreatePlaylist}>Create {ids.length > 1 ? 'COMBINED' : ''} playlist</Button>

         {spotifyPlaylist.error && <div>{spotifyPlaylist.error.message}</div>}
         {ytPlaylist.error && <div>{ytPlaylist.error.message}</div>}
      </div>
   )
}

export default Home
