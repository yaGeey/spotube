// TODO роізбратись що таке trpc
// npm install electron-trpc @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod
import { initTRPC, TRPCError } from '@trpc/server'
import chalk from 'chalk'
import { logPrettyError } from './lib/axios'
import superjson from 'superjson'
import { getSpotifyCredentialsToken, getSpotifyOAuthToken } from './lib/spotify'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

const t = initTRPC.create({
   isServer: true,
   transformer: superjson,
})

const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
   const isDiscord = path.startsWith('discord')
   const start = Date.now()
   if (!isDiscord) console.log(chalk.gray(`-> [${type}] ${path}`))

   const result = await next()
   const duration = Date.now() - start

   if (!result.ok) {
      console.error(chalk.red.bold(`X [${type}] ${path} - ${duration}ms`))
      logPrettyError(result.error)
   } else {
      if (!isDiscord) console.log(chalk.green(`V [${type}] ${path} - ${duration}ms`))
   }

   return result
})

let oauthSdk: SpotifyApi | null = null
const oauthTokenMiddleware = t.middleware(async ({ ctx, next }) => {
   const res = await getSpotifyOAuthToken()
   console.log(res)
   if (!res)
      throw new TRPCError({
         code: 'UNAUTHORIZED',
         message: 'No Spotify access token available',
      })

   if (!oauthSdk)
      oauthSdk = SpotifyApi.withAccessToken(process.env.VITE_SPOTIFY_CLIENT_ID!, {
         access_token: res.access_token,
         refresh_token: res.refresh_token,
         token_type: 'Bearer',
         expires_in: 3600,
         expires: res.expires_at,
      })

   return next({
      ctx: {
         ...ctx,
         token: res.access_token,
         sdk: oauthSdk,
      },
   })
})

let credentialsSdk: SpotifyApi | null = null
const credentialsTokenMiddleware = t.middleware(async ({ ctx, next }) => {
   const token = await getSpotifyCredentialsToken()
   if (!token) {
      throw new TRPCError({
         code: 'UNAUTHORIZED',
         message: 'No Spotify credentials token available',
      })
   }
   if (!credentialsSdk)
      credentialsSdk = SpotifyApi.withClientCredentials(process.env.VITE_SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_SECRET!, [])

   return next({
      ctx: {
         ...ctx,
         token,
         sdk: credentialsSdk,
      },
   })
})

export const router = t.router
export const publicProcedure = t.procedure.use(loggingMiddleware)
export const spotifyOAuthProcedure = publicProcedure.use(oauthTokenMiddleware)
export const spotifyCredentialsProcedure = publicProcedure.use(credentialsTokenMiddleware)
