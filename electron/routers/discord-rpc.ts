import { publicProcedure, router } from '../trpc'
import chalk from 'chalk'
import { z } from 'zod'
import { createRequire } from 'node:module'
import { ViewTrackModel } from '@/src/utils/currentTrackAdapters'
import { Artist } from '@spotify/web-api-ts-sdk'
import { Playlist } from '@/generated/prisma/client'
import { PlaylistWithItems } from '../lib/prisma'
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

// type: 0 - playing, 2 - listening, 3 - watching, 5 - competing
// status_display_type: 0 - name, 1 - state, 2 - details

// details
// state
// large_text

const defaultStatus = {
   name: 'yaGeey/spotube (the best player)',
   instance: false,
   type: 2,
}
const githubUrl = 'https://github.com/yaGeey/spotube'

const idleStatus = {
   ...defaultStatus,
   details: 'Idle',
   state: 'Browsing...',
}

let currentStartTime: number | null = null

export const discordRpcRouter = router({
   playingTrack: publicProcedure.input(z.custom<ViewTrackModel>()).mutation(({ input: t }) => {
      const curVideo = t.yt?.find((v) => v.id === t.defaultYtVideoId) || t.yt?.[0]

      const duration = curVideo?.duration ? curVideo.duration * 1000 : null
      if (!currentStartTime) currentStartTime = Date.now()

      const release_date = t.album?.releaseDate?.split('-')[0]
      setActivity({
         ...defaultStatus,
         details: t.title,
         details_url: t.url,
         state: t.artists.map((a) => a.name).join(', '),
         state_url: t.artists[0]?.url,
         status_display_type: 2,
         ...(duration && {
            timestamps: {
               start: Date.now(),
               end: Date.now() + duration,
               // TODO
               // start: currentStartTime - currentTime * 1000, // Враховуємо поточну позицію
               // end: currentStartTime + duration - currentTime * 1000,
            },
         }),
         assets: t.album
            ? {
                 large_image: t.thumbnailUrl,
                 large_text: t.album.name === t.title ? `${release_date}` : `${t.album.name} (${release_date})`,
                 large_url: t.album.url,
                 small_image: 'spotify',
                 small_text: 'Listening from Spotify',
                 small_url: t.url,
              }
            : {
                 large_image: curVideo?.thumbnailUrl.replace('http://', 'https://'),
                 large_text: curVideo?.publishedAt.getFullYear().toString(),
                 large_url: `https://www.youtube.com/watch?v=${curVideo?.id}`,
                 small_image: 'youtube',
                 small_text: 'Listening from YouTube',
                 small_url: `https://www.youtube.com/watch?v=${curVideo?.id}`,
              },
      })
   }),

   lookingAtSpotifyArtist: publicProcedure.input(z.custom<Artist>()).mutation(({ input: a }) => {
      setActivity({
         ...defaultStatus,
         details: `Viewing Artist`,
         details_url: githubUrl,
         state: a.name,
         state_url: a.external_urls?.spotify,
         status_display_type: 1,
         assets: {
            large_image: a.images?.[0]?.url,
            large_url: a.external_urls?.spotify,
            // large_text: `${a.followers?.total ?? 0} followers`,
            small_image: 'spotify',
            small_text: 'Browsing Spotify',
            small_url: githubUrl,
         },
      })
   }),

   lookingAtPlaylist: publicProcedure.input(z.custom<PlaylistWithItems>()).mutation(({ input: p }) => {
      const spotify = p.spotifyMetadata?.fullResponse
      const yt = p.youtubeMetadata?.fullResponse
      setActivity({
         ...defaultStatus,
         details: `Viewing Playlist`,
         details_url: githubUrl,
         state: p.title,
         state_url: p.url,
         status_display_type: 0,
         assets: {
            large_image: p.thumbnailUrl,
            large_text: p.title,
            small_url: githubUrl,
            ...(p.origin === 'SPOTIFY' && {
               small_image: 'spotify',
               small_text: 'Imported from Spotify',
               large_text: `${spotify?.tracks.total} tracks ${spotify?.followers && spotify?.followers.total > 1 ? `• ${spotify?.followers.total} followers` : ''}`,
               large_url: p.url,
            }),
            ...(p.origin === 'YOUTUBE' && {
               small_image: 'youtube',
               small_text: 'Imported from YouTube',
               large_text: yt?.contentDetails?.itemCount ? `${yt?.contentDetails?.itemCount} videos` : 'just yt playlist',
               large_url: p.url,
            }),
            ...(p.origin === 'LOCAL' && {
               large_url: 'https://github.com/yaGeey/spotube',
            }),
         },
      })
   }),

   //
   clear: publicProcedure.mutation(() => {
      currentStartTime = null
      setActivity(idleStatus)
   }),
})
