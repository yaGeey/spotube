import { useEffect, useMemo, useRef, useState } from 'react'
import YouTube from 'react-youtube'
import { useAudioStore } from '../hooks/useAudioStore'
import Button from '../components/Button'
import { TrackCombined } from '../types/types'
import { YtPayload, YtPayloadWithPlaylist } from '@/electron/ipc/yt'
import YtVideoCards from '../components/YtVideoCards'
import { trpc, vanillaTrpc } from '../utils/trpc'
import TracksTable from '../components/Table'
import { useParams } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import SwitchDiv from '../components/nav/SwitchDiv'
import TrackInfo from '../components/TrackInfo'

// const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
// const spotifyPlaylistId = '15aWWKnxSeQ90bLAzklH61'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

export default function Playlist() {
   const { id } = useParams()
   const spotifyPlaylistId = id || ''
   const [isFullScreen, setIsFullScreen] = useState(false)

   const { current, play, stop, setPlayerRef, setIsPlaying, tracks, setTracks, next } = useAudioStore()
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

   const allTracks = useMemo(() => {
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

      return combined
   }, [spotifyPlaylistQuery.data, ytBatchQuery.data, ytPlaylistQuery.data])

   // useEffect(() => {
   //    if (playerRef.current)
   //       if (isFullScreen) {
   //          playerRef.current.setSize(1920, 1080)
   //          playerRef.current.getIframe().requestFullscreen()
   //       } else {
   //          playerRef.current.setSize(560, 315)
   //       }
   // }, [isFullScreen])

   // TODO
   // useEffect(() => {
   //    const interval = setInterval(() => vanillaTrpc.discord.updatePresence.mutate({...current, }), 15 * 1000)
   //    return () => clearInterval(interval)
   // }, [current])
   const [selectedPanel, setSelectedPanel] = useState<'info' | 'yt'>('yt')

   return (
      <div className="grid grid-cols-[minmax(500px,_1fr)_320px] w-full">
         <div className="p-3">
            <div className="flex gap-2">
               <Button onClick={() => play({ track: tracks[Math.round(Math.random() * tracks.length - 1)] })}>PLAY random</Button>
               <Button onClick={() => stop()}>STOP</Button>
               <Button onClick={() => setIsPlayerVisible((p) => !p)}>toggle player</Button>
               <Button
                  onClick={() => {
                     // setIsFullScreen((p) => !p)
                     // playerRef.current.setSize(window.innerWidth, window.innerHeight)
                     playerRef.current.getIframe().requestFullscreen()
                  }}
               >
                  fullscreen
               </Button>
            </div>
            <div className={twMerge('aspect-video block w-full', (!isPlayerVisible || !current) && 'hidden')}>
               <YouTube
                  className="w-full h-full inset-0"
                  opts={{
                     height: '100%',
                     width: '100%',
                     // height: '1080',
                     // width: '1920',
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
                     setPlayerRef(event.target)
                  }}
                  onStateChange={(event) => {
                     /**
                        -1 // UNSTARTED - відео ще не почалось
                        0  // ENDED - відео закінчилось
                        1  // PLAYING - відео грає зараз
                        2  // PAUSED - відео на паузі
                        3  // BUFFERING - відео завантажується/буферизується
                        5  // CUED - відео готове до програвання 
                     */
                     if (event.data === 1 || event.data === 3) {
                        const available = event.target.getAvailableQualityLevels()
                        console.log('Available qualities:', available)
                        console.log('Current quality:', event.target.getPlaybackQuality())

                        if (available.length > 0) {
                           event.target.setPlaybackQuality(available[0])

                           // Перевірка через секунду чи застосувалось
                           setTimeout(() => {
                              console.log('Quality after set:', event.target.getPlaybackQuality())
                           }, 1000)
                        }
                     }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnd={() => next()}
               />
            </div>
            {allTracks && <TracksTable data={allTracks} />}
         </div>
         <div>
            <SwitchDiv value={selectedPanel} setValue={setSelectedPanel} />
            {selectedPanel === 'yt' && <YtVideoCards />}
            {selectedPanel === 'info' && current && <TrackInfo data={current} />}
         </div>
      </div>
   )
}
