import { publicProcedure, router } from '../trpc'
import chalk from 'chalk'
import { z } from 'zod'
import { createRequire } from 'node:module'
import { TrackWithRelations } from '../lib/prisma'
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
}

const idleStatus = {
   details: 'Idle',
   state: 'Browsing...',
   instance: false,
   type: 2,
}

let currentStartTime: number | null = null

export const discordRpcRouter = router({
   updatePresence: publicProcedure.input(z.object({}).loose()).mutation(({ input }) => {
      const t = input as TrackWithRelations & { currentTime?: number }
      const { spotify, yt, currentTime = 0 } = t
      const currentVideo = yt?.find((v) => v.id === t.defaultYtVideoId) || yt?.[0]
      const spotifyTrack = spotify?.fullResponse

      const duration = currentVideo?.duration ? currentVideo.duration * 1000 : spotifyTrack?.duration_ms
      if (!currentStartTime) currentStartTime = Date.now()

      const release_date = spotifyTrack?.album.release_date?.split('-')[0]
      setActivity({
         details: t.title,
         state: t.artists.map((a) => a.name).join(', '),
         ...(duration && {
            timestamps: {
               start: Date.now(),
               end: Date.now() + duration,
               // TODO
               // start: currentStartTime - currentTime * 1000, // Враховуємо поточну позицію
               // end: currentStartTime + duration - currentTime * 1000,
            },
         }),
         assets: spotify
            ? {
                 large_image: spotifyTrack?.album.images[0].url,
                 large_text:
                    spotifyTrack?.album.name === spotify?.title
                       ? `${release_date}`
                       : `${spotifyTrack?.album.name} (${release_date})`,
                 large_url: spotifyTrack?.album.external_urls.spotify,
                 small_image: 'spotify',
                 small_text: 'Listening from Spotify',
                 small_url: spotifyTrack?.external_urls.spotify,
              }
            : {
                 large_image: currentVideo?.thumbnailUrl.replace('http://', 'https://'),
                 large_text: currentVideo?.publishedAt.getFullYear().toString(),
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
   clear: publicProcedure.mutation(() => {
      currentStartTime = null
      setActivity(idleStatus)
   }),
})
