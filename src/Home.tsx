import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube' // TODO
import { useAudioStore } from './hooks/useAudioStore'
import Button from './components/Button'
import { TrackCombined } from './types/types'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { YtPayload, YtPayloadWithPlaylist } from '@/electron/ipc/yt'
import { SpotifyPlaylistResponse } from '@/electron/ipc/spotify'
import Card from './components/Card'
import YtVideoCards from './components/YtVideoCards'
import { trpc } from './utils/trpc'

const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

export default function Home() {
   const { current, play, stop, setPlayerRef, setIsPlaying, setTracks, tracks } = useAudioStore()
   const [isPlayerVisible, setIsPlayerVisible] = useState(true)
   const playerRef = useRef<any>(null)

   const spotifyPlaylistQuery = trpc.spotify.getPlaylist.useQuery(spotifyPlaylistId)
   const ytPlaylistQuery = trpc.yt.getPlaylist.useQuery(youtubePlaylistId)
   const ytBatchQuery = trpc.yt.batchFromSpotifyTracks.useQuery(
      (spotifyPlaylistQuery.data?.items || []).map((item) => ({
         query: {
            artist: item.artist,
            title: item.title,
         },
         spotifyId: item.id,
      })),
      {
         enabled: !!spotifyPlaylistQuery.data?.items?.length,
      }
   )
   
   // const [aiGenerating, setAIGenerating] = useState(false)
   // const AIQueries = useQueries({
   //    queries: tracks
   //       .filter((a) => a.spotify)
   //       .map((item) => ({
   //          queryKey: ['ai-music-data', item.spotify?.id],
   //          queryFn: async () => {
   //             const title = item.spotify!.track?.name
   //             const artist = item.spotify!.track?.artists.map((a) => a.name).join(', ') || ''
   //             return await window.ipcRenderer.invoke('ai-music-data', title, artist)
   //          },
   //          enabled: false,
   //       })),
   // })

   useEffect(() => {
      if (!spotifyPlaylistQuery.data || !ytBatchQuery.data) return
      // TODO spotify are from full_response, but yt from db fields - standardize this
      const spotify = spotifyPlaylistQuery.data.items
      const spotifyFiltered = spotify.filter((item) => item.full_response.track)

      const ytfs = ytBatchQuery.data.filter((videos) => videos.length > 0)
      const ytfsMap = new Map<string, YtPayload[]>()
      ytfs.forEach((videos) => {
         if (videos[0]?.spotify_id) {
            ytfsMap.set(videos[0].spotify_id, videos as any)
         }
      })

      if (spotify.length !== ytfs.length) {
         alert(`Mismatch in lengths: Spotify items (${spotify.length}) and YouTube items (${ytfs.length}). There might be missing tracks.`)
      }

      const combined = spotifyFiltered.map((item) => ({
         spotify: item,
         yt: ytfsMap.get(item.id) || null,
      })) satisfies TrackCombined[]
      ytPlaylistQuery.data?.content.forEach((ytItem) => combined.push({ spotify: null as any, yt: [ytItem] }))
      setTracks(combined)

      console.log('spoti | yt from spoty | combined', spotifyPlaylistQuery.data, ytBatchQuery.data, combined)
      console.log('yt', ytPlaylistQuery.data)
   }, [spotifyPlaylistQuery.data, ytBatchQuery.data, ytPlaylistQuery.data, setTracks])

   // useEffect(() => {
   //    const updatedTracks = tracks.map((track, i) => ({
   //       ...track,
   //       ai: AIQueries[i]?.data || null,
   //    }))
   //    setTracks(updatedTracks)
   // }, [AIQueries.map((q) => q.data)])
   // console.log(tracks)

   return (
      <div className="grid grid-cols-[100px_minmax(500px,_1fr)_320px]">
         <div className="bg-main"></div>
         <div className="p-3">
            <div className="flex gap-2">
               {/* <Button onClick={() => setAIGenerating(true)}>{aiGenerating ? 'Generating..' : 'Generate AI data'}</Button> */}
               <Button onClick={() => play(tracks[Math.round(Math.random() * tracks.length - 1)])}>PLAY random</Button>
               <Button onClick={() => stop()}>STOP</Button>
               <Button onClick={() => setIsPlayerVisible((p) => !p)}>toggle player</Button>
               <Button onClick={() => console.log(playerRef.current?.getCurrentTime() + ' / ' + playerRef.current.getDuration())}>
                  getDuration
               </Button>
            </div>
            <YouTube
               // videoId={current?.yt?.[0].id}
               opts={{
                  width: isPlayerVisible ? '560' : '0',
                  height: isPlayerVisible ? '315' : '0',
                  playerVars: {
                     autoplay: 1,
                     mute: 0,
                     playsinline: 1,
                     enablejsapi: 1,
                     controls: 0,
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
            <div className="flex flex-col gap-1">
               {tracks.map((track, i) => (
                  <Card key={track.yt?.[0].id} data={track} index={i} />
               ))}
            </div>
         </div>
         <YtVideoCards />
      </div>
   )
}
