import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube' // TODO
import { useAudioStore } from './hooks/useAudioStore'
import Button from './components/Button'
import { DBInput, DBYtResponse, TrackCombined } from './types/types'
import { useQueries, useQuery } from '@tanstack/react-query'
import { PlaylistItem } from './types/spotify'
import { v5 as uuidv5 } from 'uuid'
import useLastfmData from './hooks/useLastfmData'

const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
const youtubePlaylistId = 'PLnYVx6d3vk61GHkkWLwkKK499EprZYX13'

export default function Home() {
   const { current, play, stop, setPlayerRef, setIsPlaying, setTracks, tracks } = useAudioStore()
   const [isPlayerVisible, setIsPlayerVisible] = useState(true)
   const playerRef = useRef<any>(null)

   // --- get spotify playlist ---
   const spotifyPlaylistQuery = useQuery({
      queryKey: ['spotify-playlist', spotifyPlaylistId],
      queryFn: async (): Promise<PlaylistItem[]> => await window.ipcRenderer.invoke('get-spotify-playlist', spotifyPlaylistId, true),
   })

   // --- get youtube playlist ---
   const ytPlaylistQuery = useQuery({
      queryKey: ['youtube-playlist', youtubePlaylistId],
      queryFn: async (): Promise<DBYtResponse[]> => await window.ipcRenderer.invoke('get-yt-playlist', youtubePlaylistId),
   })

   // --- get youtube from spotify tracks ---
   const ytFromSpotifyQuery = useQuery({
      queryKey: ['youtube-from-spotify', spotifyPlaylistId],
      queryFn: async (): Promise<DBYtResponse[][]> => {
         return await Promise.all(
            (spotifyPlaylistQuery.data || []).map(async (item) => {
               return await window.ipcRenderer.invoke(
                  'yt-from-spotify',
                  { artist: item.track.artists.map((artist) => artist.name).join(' '), track: item.track.name },
                  item.track.id
               )
            })
         )
      },
      enabled: !!spotifyPlaylistQuery.data,
   })

   useEffect(() => {
      if (!spotifyPlaylistQuery.data || !ytFromSpotifyQuery.data) return

      const arr = [
         ...(spotifyPlaylistQuery.data || []).map((item) => ({ spotify: item })),
         ...(ytPlaylistQuery.data || []).map((videos) => ({ yt: [videos] })),
      ] as TrackCombined[]

      setTracks(
         arr.map((item, i) => ({
            spotify: item.spotify || spotifyPlaylistQuery.data?.[i] || null,
            yt: item.yt || ytFromSpotifyQuery.data?.[i] || null,
         }))
      )

      console.log('spoti len | yt len | combined', spotifyPlaylistQuery.data?.length, ytFromSpotifyQuery.data?.length, tracks)
   }, [spotifyPlaylistQuery.data, ytFromSpotifyQuery.data, ytPlaylistQuery.data, setTracks, tracks])

   return (
      <div>
         <div className="flex gap-2">
            <Button onClick={() => play(tracks[Math.round(Math.random() * tracks.length - 1)])}>PLAY random</Button>
            <Button onClick={() => stop()}>STOP</Button>
            <Button onClick={() => setIsPlayerVisible((p) => !p)}>toggle player</Button>
            <Button onClick={() => console.log(playerRef.current?.getCurrentTime() + ' / ' + playerRef.current.getDuration())}>
               getDuration
            </Button>
         </div>
         <YouTube
            videoId={current?.yt?.[0].id}
            opts={{
               width: isPlayerVisible ? '560' : '0',
               height: isPlayerVisible ? '315' : '0',
               playerVars: {
                  autoplay: 1,
                  mute: 0,
                  playsinline: 1,
                  enablejsapi: 1,
               },
            }}
            onReady={(event) => {
               console.log('✅ YouTube Player ready', event.target)
               playerRef.current = event.target
               setPlayerRef(event.target)
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnd={() => setIsPlaying(false)}
         />
      </div>
   )
}
