import { router } from './trpc'
import { spotifyRouter } from './routers/spotify'
import { ytRouter } from './routers/yt'
import { discordRpcRouter } from './routers/discord-rpc'
import geniusRouter from './routers/genius'

export const appRouter = router({
   spotify: spotifyRouter,
   yt: ytRouter,
   discord: discordRpcRouter,
   genius: geniusRouter,
})
export type AppRouter = typeof appRouter
