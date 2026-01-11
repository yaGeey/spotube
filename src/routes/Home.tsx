import React from 'react'
import Button from '../components/Button'
import { trpc } from '../utils/trpc'

function Home() {
   const [inputValue, setInputValue] = React.useState('')
   const utils = trpc.useUtils()
   const spotify = trpc.spotify.createPlaylist.useMutation({ onSuccess: () => utils.spotify.getPlaylists.refetch() })
   const youtube = trpc.yt.createPlaylist.useMutation()

   function parseIdFromUrl(url: string) {
      const parts = url.split('/')
      return parts[parts.length - 1].split('?')[0]
   }

   return (
      <div>
         <Button onClick={() => spotify.mutate(parseIdFromUrl(inputValue))}>Add spotify playlist</Button>
         <Button onClick={() => youtube.mutate(parseIdFromUrl(inputValue))}>Add youtube playlist</Button>
         <input
            onChange={(e) => setInputValue(e.currentTarget.value)}
            className="bg-white placeholder:text-black/50 text-black"
            placeholder="id"
         />

         {spotify.error && <div>{spotify.error.message}</div>}
         {youtube.error && <div>{youtube.error.message}</div>}
      </div>
   )
}

export default Home
