import { publicProcedure, router } from '../trpc'
import { TrackCombined } from '../../src/types/types'
import chalk from 'chalk'
import { z } from 'zod'
import { createRequire } from 'node:module'
// https://discord.com/developers/docs/events/gateway-events#activity-object-activity-types
// https://discord.com/developers/docs/topics/rpc#setactivity
const require = createRequire(import.meta.url)
const DiscordRPC = require('discord-rpc') as typeof import('discord-rpc')

const rpc = new DiscordRPC.Client({ transport: 'ipc' })

let isReady = false
rpc.on('ready', () => {
   console.log(chalk.green('Discord RPC connected'))
   isReady = true
   setActivity(idleStatus)
})

rpc.login({ clientId: import.meta.env.VITE_DISCORD_CLIENT_ID }).catch((err) => {
   console.error(chalk.yellow('Connection error Discord RPC:', err.message))
})

function setActivity(payload: any) {
   if (!isReady) return
   ;(rpc as any)
      // TODO clear activity on exit
      .request('SET_ACTIVITY', {
         pid: process.pid,
         activity: payload,
      })
      .catch((err: any) => {
         console.error('Error Discord RAW SET_ACTIVITY:', err)
      })
}

const idleStatus = {
   details: 'Idle',
   state: 'Browsing...',
   instance: false,
   type: 2,
}

export const discordRpcRouter = router({
   updatePresence: publicProcedure.input(z.object({}).loose()).mutation(({ input }) => {
      const { spotify, yt } = input as TrackCombined
      const currentVideo = yt?.find((v) => v.id === spotify?.default_yt_video_id) || yt?.[0]
      const spotifyTrack = spotify?.full_response.track

      const duration = currentVideo?.duration_ms ?? spotifyTrack?.duration_ms
      setActivity({
         details: spotify?.title ?? currentVideo?.title,
         state: spotify?.artists ?? currentVideo?.author,
         ...(duration && {
            timestamps: {
               start: Date.now(),
               end: Date.now() + duration,
            },
         }),
         assets: spotify
            ? {
                 large_image: spotifyTrack?.album.images[0].url,
                 large_text: `${spotifyTrack?.album.name} (${spotifyTrack?.album.release_date?.split('-')[0]})`,
                 large_url: spotifyTrack?.album.external_urls.spotify,
                 small_image: 'spotify',
                 small_text: 'Listening from Spotify',
                 small_url: spotifyTrack?.external_urls.spotify,
              }
            : {
                 large_image: currentVideo?.thumbnail_url.replace('http://', 'https://'),
                 large_text: currentVideo?.title,
                 large_url: `https://www.youtube.com/watch?v=${currentVideo?.id}`,
                 small_image: 'youtube',
                 small_text: 'Listening from YouTube',
                 small_url: `https://www.youtube.com/watch?v=${currentVideo?.id}`,
              },
         instance: false,
         type: 2,
      })
   }),

   //
   clear: publicProcedure.mutation(() => setActivity(idleStatus)),
})
