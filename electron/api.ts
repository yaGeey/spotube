import { router } from './trpc'
import { discordRpcRouter } from './routers/discord-rpc'
import { spotifyRouter } from './routers/spotify'
import { youtubeRouter } from './routers/yt'
import { playlistsRouter } from './routers/playlists'
import { tracksRouter } from './routers/tracks'
import { lastFMRouter } from './routers/lastfm'
import { systemRouter } from './routers/system'
import geniusRouter from './routers/genius'

export const appRouter = router({
   system: systemRouter,
   tracks: tracksRouter,
   playlists: playlistsRouter,

   discord: discordRpcRouter,
   spotify: spotifyRouter,
   yt: youtubeRouter,
   lastfm: lastFMRouter,
   genius: geniusRouter,
})
export type AppRouter = typeof appRouter
