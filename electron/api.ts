import { router } from './trpc'
import { discordRpcRouter } from './routers/discord-rpc'
import { spotifyRouter } from './routers/spotify'
import { youtubeRouter } from './routers/yt'
import { playlistsRouter } from './routers/playlists'
import { tracksRouter } from './routers/tracks'
import { lastFMRouter } from './routers/lastfm'
import { systemRouter } from './routers/system'
import geniusRouter from './routers/genius'
import { combinedPlaylistsRouter } from './routers/combinedPlaylists'
// import { ytStreamsRouter } from './routers/ytStreams'

export const appRouter = router({
   system: systemRouter,
   tracks: tracksRouter,
   playlists: playlistsRouter,
   combinedPlaylists: combinedPlaylistsRouter,

   discord: discordRpcRouter,
   spotify: spotifyRouter,
   yt: youtubeRouter,
   // ytStreams: ytStreamsRouter,
   lastfm: lastFMRouter,
   genius: geniusRouter,
})
export type AppRouter = typeof appRouter
