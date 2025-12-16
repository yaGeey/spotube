import { Client } from 'discord-rpc'
import { Track, TrackCombined } from '../../src/types/types'
import chalk from 'chalk'
// https://discord.com/developers/docs/events/gateway-events#activity-object-activity-types

function setActivity(rpc: Client, payload: any) {
   ;(rpc as any)
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

export default function discordRpc(rpc: Client, ipcMain: Electron.IpcMain) {
   rpc.on('ready', () => {
      console.log(chalk.green('Discord RPC connected'))
      setActivity(rpc, idleStatus)
   })

   ipcMain.on('update-discord-presence', (event, data: TrackCombined) => {
      if (!rpc) return
      setActivity(rpc, {
         details: data.spotify?.track.name ?? data.yt?.[0].title,
         state: data.spotify?.track.artists.map((a) => a.name).join(' ') ?? data.yt?.[0].artist,
         timestamps: {
            start: Date.now(),
            end: Date.now() + data.spotify?.track.duration_ms!, // TODO change to yt duration
         },
         assets: data.spotify
            ? {
                 large_image: data.spotify?.track.images[0].url,
                 large_text: data.spotify?.track.name,
                 small_image: 'spotify',
                 small_text: 'Listening on Spotify',
                 large_url: data.spotify?.track.external_urls.spotify,
                 small_url: data.spotify?.track.external_urls.spotify,
              }
            : {
                 large_image: data.yt?.[0].full_response.snippet?.thumbnails?.default?.url?.replace('http://', 'https://'),
                 large_text: data.yt?.[0].title,
                 small_image: 'youtube',
                 small_text: 'Listening on YouTube',
                 large_url: `https://www.youtube.com/watch?v=${data.yt?.[0].id}`,
                 small_url: `https://www.youtube.com/watch?v=${data.yt?.[0].id}`,
              },
         instance: false,
         type: 2,
      })
   })

   ipcMain.on('clear-discord-presence', () => {
      if (!rpc) return
      setActivity(rpc, idleStatus)
   })

   rpc.login({ clientId: import.meta.env.VITE_DISCORD_CLIENT_ID }).catch((err) => {
      console.error('⚠️ Connection error Discord RPC:', err.message)
   })
}
