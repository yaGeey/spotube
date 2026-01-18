import { router } from './trpc'
import { discordRpcRouter } from './routers/discord-rpc'
import { spotifyRouter } from './routers/spotify'
import { youtubeRouter } from './routers/yt'
import { playlistsRouter } from './routers/playlists'
import { tracksRouter } from './routers/tracks'
import { lastFMRouter } from './routers/lastfm'

export const appRouter = router({
   tracks: tracksRouter,
   playlists: playlistsRouter,

   discord: discordRpcRouter,
   spotify: spotifyRouter,
   yt: youtubeRouter,
   lastfm: lastFMRouter,
})
export type AppRouter = typeof appRouter
