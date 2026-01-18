import { useEffect, useMemo, useRef, useState } from 'react'
import YouTube from 'react-youtube'
import { useAudioStore } from '../audio_store/useAudioStore'
import Button from '../components/Button'
import { YtPayload, YtPayloadWithPlaylist } from '@/electron/ipc/yt'
import YtVideoCards from '../components/YtVideoCards'
import { trpc, vanillaTrpc } from '../utils/trpc'
import TracksTable from '../components/Table'
import { useParams } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import SwitchDiv from '../components/nav/SwitchDiv'
import TrackInfo from '../components/TrackInfo'
import { PlaylistWithItems } from '@/electron/lib/prisma'
import { PlaylistItem } from '@/generated/prisma/client'

// const spotifyPlaylistId = '14Xkp84ZdOHvnBlccaiR3f'
// const spotifyPlaylistId = '15aWWKnxSeQ90bLAzklH61'
const youtubePlaylistId = 'PLnYVx6d3vk609QDKMgBE52tDqP7fRi1pE'

export default function Playlist() {
   const { id } = useParams()
   const playlistId = id ? parseInt(id) : 0
   const [isFullScreen, setIsFullScreen] = useState(false)
   const [selectedPanel, setSelectedPanel] = useState<'info' | 'yt'>('yt')

   const { current, play, stop, setPlayerRef, setIsPlaying, tracks, next, setPlaylistId, updateTrack } = useAudioStore()
   const [isPlayerVisible, setIsPlayerVisible] = useState(true)
   const playerRef = useRef<any>(null)
   useEffect(() => setPlaylistId(playlistId), [setPlaylistId, playlistId])

   const lastfmmutation = trpc.lastfm.upsertBatch.useMutation()

   const playlist = trpc.playlists.getById.useQuery(playlistId)
   const isYt = playlist.data?.origin === 'YOUTUBE'
   if (!playlist.data) return <div>Loading...</div>
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
               <Button
                  onClick={async () => {
                     // TODO only for first artist
                     const data = await lastfmmutation.mutateAsync(
                        tracks.map((t) => ({ artist: t.artists.split(',')[0], title: t.title, masterId: t.id })),
                     )
                     if (data) alert('LastFM data upserted. Reload the page')
                  }}
               >
                  LastFM
               </Button>
            </div>
            <div className={twMerge('aspect-video block w-full', (!isPlayerVisible || !current) && 'hidden')}>
               <YouTube
                  className="w-full h-full inset-0"
                  opts={{
                     origin: window.location.origin,
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
                        rel: 0,
                        iv_load_policy: 3,
                        modestbranding: 1,
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
            {playlist.data && <TracksTable data={playlist.data.playlistItems} playlistId={playlist.data.id} />}
         </div>
         <div>
            {!isYt && <SwitchDiv value={selectedPanel} setValue={setSelectedPanel} />}
            {selectedPanel === 'yt' && <YtVideoCards />}
            {(selectedPanel === 'info' || isYt) && current && <TrackInfo data={current} />}
         </div>
      </div>
   )
}
