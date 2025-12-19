import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube' // TODO
import { useAudioStore } from './hooks/useAudioStore'
import Button from './components/Button'
import { TrackCombined } from './types/types'
import { useQueries, useQuery } from '@tanstack/react-query'
import { YtPayload, YtPayloadWithPlaylist } from '@/electron/ipc/yt'
import { SpotifyPlaylistResponse } from '@/electron/ipc/spotify'

const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
const youtubePlaylistId = 'PLnYVx6d3vk61GHkkWLwkKK499EprZYX13'

export default function Home() {
   const { current, play, stop, setPlayerRef, setIsPlaying, setTracks, tracks } = useAudioStore()
   const [isPlayerVisible, setIsPlayerVisible] = useState(true)
   const playerRef = useRef<any>(null)

   // --- get spotify playlist ---
   const spotifyPlaylistQuery = useQuery({
      queryKey: ['spotify-playlist', spotifyPlaylistId],
      queryFn: async (): Promise<SpotifyPlaylistResponse> =>
         await window.ipcRenderer.invoke('get-spotify-playlist', spotifyPlaylistId, true),
   })

   // --- get youtube playlist ---
   const ytPlaylistQuery = useQuery({
      queryKey: ['yt-playlist', youtubePlaylistId],
      queryFn: async (): Promise<YtPayloadWithPlaylist> => await window.ipcRenderer.invoke('get-yt-playlist', youtubePlaylistId),
   })

   // --- get youtube from spotify tracks ---
   const ytFromSpotifyQuery = useQuery({
      queryKey: ['yt-from-spotify', spotifyPlaylistId],
      queryFn: async (): Promise<YtPayload[][]> => {
         return await Promise.all(
            (spotifyPlaylistQuery.data?.items || []).map(async (item) => {
               return await window.ipcRenderer.invoke('yt-from-spotify', { artist: item.artist, track: item.title }, item.id)
            })
         )
      },
      enabled: !!spotifyPlaylistQuery.data,
   })

   useEffect(() => {
      if (!spotifyPlaylistQuery.data || !ytFromSpotifyQuery.data) return
      // TODO spotify are from full_response, but yt from db fields - standardize this
      const spotify = spotifyPlaylistQuery.data.items.map((item) => item.full_response)
      const spotifyFiltered = spotify.filter((item) => item.track)

      const yt = ytFromSpotifyQuery.data.filter((videos) => videos.length > 0)
      const ytMap = new Map<string, YtPayload[]>(yt.map((videos, index) => [videos[0].spotify_id!, videos]))
      
      if (spotify.length !== yt.length) {
         alert(`Mismatch in lengths: Spotify items (${spotify.length}) and YouTube items (${yt.length}). There might be missing tracks.`)
      }

      const combined = spotifyFiltered.map((item) => ({
         spotify: item,
         yt: ytMap.get(item.track!.id) || null,
      })) satisfies TrackCombined[]
      setTracks(combined)

      console.log('spoti len | yt len | combined', spotifyPlaylistQuery.data, ytFromSpotifyQuery.data, combined)
   }, [spotifyPlaylistQuery.data, ytFromSpotifyQuery.data, ytPlaylistQuery.data, setTracks])

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