import { useRef } from 'react'
import YouTube from 'react-youtube'
import { useAudioStore } from '../audio_store/useAudioStore'

export default function YouTubePlayer() {
   const playerRef = useRef<any>(null)

   return (
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
         onReady={async (event) => {
            playerRef.current = event.target
            useAudioStore.setState({ playerRef: event.target })
            await useAudioStore.getState().initAdapter()
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
               console.log(event.target.getPlaybackQuality(), available)
            }
         }}
         onPlay={() => useAudioStore.setState({ isPlaying: true })}
         onPause={() => useAudioStore.setState({ isPlaying: false })}
         onEnd={() => useAudioStore.getState().next()}
      />
   )
}
