import { BrowserWindow } from 'electron'
import { publicProcedure, router } from '../trpc'
import { store, win } from '../main'
import Genius from 'genius-lyrics'
import prisma from '../lib/prisma'
import z from 'zod'
import { omitFunctions, safeSerialize } from '@/utils/objects'
// Implicit Grant Flow
// https://REDIRECT_URI/#access_token=ACCESS_TOKEN&state=STATE
const client = new Genius.Client()

const geniusRouter = router({
   oauth: publicProcedure.mutation(async () => {
      // в проміс шоб чекати завершення авторизації
      return new Promise((resolve, reject) => {
         const authUrl =
            'https://api.genius.com/oauth/authorize?' +
            new URLSearchParams({
               client_id: process.env.GENIUS_CLIENT_ID!,
               redirect_uri: process.env.VITE_REDIRECT_URI!,
               // response_type: 'code',
               response_type: 'token',
               scope: 'me',
            }).toString()

         const authWindow = new BrowserWindow({
            width: 500,
            height: 700,
            parent: win!,
            modal: true,
            webPreferences: {
               nodeIntegration: false,
               contextIsolation: true,
               partition: 'persist:genius-auth', // Окрема сесія для auth щоб уникнути конфліктів кешу
            },
         })
         authWindow.webContents.session.clearCache()
         authWindow.loadURL(authUrl)
         authWindow.webContents.on('will-redirect', async (event: unknown, url: string) => {
            // Якщо це редірект на логін, signup, або будь-що інше, крім нашого callback - ігноруємо.
            // Даємо браузеру працювати далі.
            if (!url.startsWith(process.env.VITE_REDIRECT_URI!)) return
            try {
               // if (!url.startsWith(import.meta.env.VITE_REDIRECT_URI)) throw new Error('⏭️ Not our redirect URI, ignoring')
               const rawHash = url.split('#')[1]
               console.log(url)
               const params = new URLSearchParams(rawHash)
               const accessToken = params.get('access_token')
               if (!accessToken) throw new Error('No access token found in redirect URI')

               store.set('genius.access_token', accessToken)
               resolve(accessToken)
               authWindow.close()
               return accessToken
            } catch (error) {
               reject(error)
               authWindow.close()
            }
         })
      })
   }),

   // TODO rewrite!!!!!!! only for 1 video in list
   scrapLyrics: publicProcedure.input(z.object({ ytId: z.string() })).mutation(async ({ input }) => {
      const songs = await client.songs.search('Foreground Eclipse From Under Cover')
      const lyrics = await songs[0].lyrics()
      const prismaRes = await prisma.genius.create({
         data: {
            lyrics: lyrics,
            full_response: safeSerialize(songs[0]),
         },
      })
      await prisma.youtubeVideo.update({
         where: { id: input.ytId },
         data: { geniusId: prismaRes.id },
      })
      return prismaRes
   }),
})

export default geniusRouter
