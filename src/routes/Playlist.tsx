import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube' // TODO
import { useAudioStore } from '../hooks/useAudioStore'
import Button from '../components/Button'
import { TrackCombined } from '../types/types'
import { YtPayload, YtPayloadWithPlaylist } from '@/electron/ipc/yt'
import YtVideoCards from '../components/YtVideoCards'
import { trpc } from '../utils/trpc'
import TracksTable from '../components/Table'
import { useParams } from 'react-router-dom'

// const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
// const spotifyPlaylistId = '15aWWKnxSeQ90bLAzklH61'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

export default function Playlist() {
   const { id } = useParams()
   const spotifyPlaylistId = id || ''

   const { play, stop, setPlayerRef, setIsPlaying, tracks, setTracks } = useAudioStore()
   const [isPlayerVisible, setIsPlayerVisible] = useState(true)
   const playerRef = useRef<any>(null)

   const spotifyPlaylistQuery = trpc.spotify.getPlaylist.useQuery(spotifyPlaylistId)
   const ytPlaylistQuery = trpc.yt.getPlaylist.useQuery(youtubePlaylistId)
   const ytBatchQuery = trpc.yt.batchFromSpotifyTracks.useQuery(
      (spotifyPlaylistQuery.data?.items || []).map((item) => ({
         query: {
            artist: item.artists.split(',')[0],
            title: item.title,
         },
         spotifyId: item.id,
      })),
      {
         enabled: !!spotifyPlaylistQuery.data?.items?.length,
      }
   )

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

      const combined = spotifyFiltered.map((item) => ({
         spotify: item,
         yt: ytfsMap.get(item.id) || null,
      })) satisfies TrackCombined[]
      ytPlaylistQuery.data?.content.forEach((ytItem) => combined.push({ spotify: null as any, yt: [ytItem] }))

      setTracks(combined)
   }, [spotifyPlaylistQuery.data, ytBatchQuery.data, ytPlaylistQuery.data, setTracks])

   return (
      <div className="grid grid-cols-[minmax(500px,_1fr)_320px]">
         <div className="p-3">
            <div className="flex gap-2">
               <Button onClick={() => play({ track: tracks[Math.round(Math.random() * tracks.length - 1)] })}>PLAY random</Button>
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
                  playerRef.current = event.target
                  console.log('🎬 YouTube Player ready', event.target)
                  setPlayerRef(event.target)
               }}
               onPlay={() => setIsPlaying(true)}
               onPause={() => setIsPlaying(false)}
               onEnd={() => setIsPlaying(false)}
            />
            <TracksTable data={tracks} />
         </div>
         <YtVideoCards />
      </div>
   )
}
