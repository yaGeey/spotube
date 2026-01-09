import { router } from './trpc'
import { spotifyRouter } from './routers/spotify'
import { ytRouter } from './routers/yt'
import { discordRpcRouter } from './routers/discord-rpc'

export const appRouter = router({
   spotify: spotifyRouter,
   yt: ytRouter,
   discord: discordRpcRouter,
})
export type AppRouter = typeof appRouter
