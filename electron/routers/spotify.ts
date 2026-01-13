import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '../lib/prisma'
import { createAndSyncPlaylist, getSpotifyToken } from '../lib/spotify'
import api from '../lib/axios'
import chalk from 'chalk'
import { BrowserWindow } from 'electron'
import { store, win } from '../main'
import { SpotifyPlaylist, SpotifyTrack } from '@/generated/prisma/client'

export type SpotifyPlaylistResponse = SpotifyPlaylist & { items: SpotifyTrack[] }

export const spotifyRouter = router({
   updateDefaultVideo: publicProcedure
      .input(z.object({ spotifyTrackId: z.string(), youtubeVideoId: z.string().nullable() }))
      .mutation(async ({ input }) => {
         const { spotifyTrackId, youtubeVideoId } = input
         await prisma.spotifyTrack.update({
            where: { id: spotifyTrackId },
            data: {
               default_yt_video_id: youtubeVideoId,
            },
         })
      }),

   //
   getPlaylist: publicProcedure.input(z.string()).query(async ({ input }): Promise<SpotifyPlaylistResponse> => {
      const { accessToken, playlist, playlistRes } = await createAndSyncPlaylist(input)

      const cachedTracks = await prisma.spotifyTrack.findMany({
         where: { playlists: { some: { id: playlist.id } } },
      })

      // Snapshot співпадає І треки існують у базі
      // Якщо це новий плейлист, cachedTracks.length буде 0, і ми підемо фечити дані далі
      if (playlist.snapshot_id === playlistRes.snapshot_id && cachedTracks.length === playlistRes.tracks.total) {
         return {
            ...playlist,
            items: cachedTracks,
         }
      }
      console.log(chalk.yellow('Spotify playlist snapshot changed or no cached tracks, fetching tracks...'))

      // pagination
      const tracks = [...playlistRes.tracks.items]
      let pagingObject = playlistRes.tracks
      while (pagingObject.next) {
         const res = await api.get(pagingObject.next, {
            headers: { Authorization: `Bearer ${accessToken}` },
         })
         pagingObject = res.data
         tracks.push(...pagingObject.items)
      }

      // insert tracks into db
      const operations = tracks
         .map((item) => {
            if (!item.track || !item.track.id) return null // skip local or unavailable tracks
            return prisma.spotifyTrack.upsert({
               where: { id: item.track.id },
               update: { playlists: { connect: { id: playlist!.id } } },
               create: {
                  id: item.track.id,
                  title: item.track.name,
                  full_response: item,
                  artists: item.track.artists.map((artist) => artist.name).join(', '),
                  playlists: { connect: { id: playlist!.id } },
               },
            })
         })
         .filter((op) => op !== null)
      const tracksPrisma = await prisma.$transaction(operations)

      // update snapshot id
      const newPlaylist = await prisma.spotifyPlaylist.update({
         where: { id: playlist.id },
         data: { snapshot_id: playlistRes.snapshot_id },
      })

      return {
         ...newPlaylist,
         items: tracksPrisma,
      }
   }),

   //
   oauth: publicProcedure.mutation(async () => {
      const scope = 'playlist-read-private'
      const authUrl =
         'https://accounts.spotify.com/authorize?' +
         new URLSearchParams({
            response_type: 'code',
            client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
            scope,
            redirect_uri: import.meta.env.VITE_REDIRECT_URI,
         }).toString()
      // shell.openExternal(authUrl) // TODO: for production
      // Створюємо модальне вікно для OAuth
      const authWindow = new BrowserWindow({
         width: 500,
         height: 700,
         parent: win!,
         modal: true,
         webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            partition: 'persist:spotify-auth', // Окрема сесія для auth щоб уникнути конфліктів кешу
         },
      })
      await authWindow.webContents.session.clearCache()

      authWindow.loadURL(authUrl)
      authWindow.webContents.on('will-redirect', async (event: unknown, url: string) => {
         try {
            if (url.startsWith(import.meta.env.VITE_REDIRECT_URI)) throw new Error('⏭️ Not our redirect URI, ignoring')

            const code = new URL(url).searchParams.get('code')
            if (!code) throw new Error('❌ No code in redirect URL')

            const { data } = await api.post(
               'https://accounts.spotify.com/api/token',
               new URLSearchParams({
                  grant_type: 'authorization_code',
                  code: code,
                  redirect_uri: import.meta.env.VITE_REDIRECT_URI!,
               }).toString(),
               {
                  headers: {
                     Authorization:
                        'Basic ' +
                        Buffer.from(
                           `${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`
                        ).toString('base64'),
                     'Content-Type': 'application/x-www-form-urlencoded',
                  },
               }
            )

            // Зберігаємо токени в electron-store
            store.set('spotify.access_token', data.access_token)
            store.set('spotify.refresh_token', data.refresh_token)
            store.set('spotify.expires_at', Date.now() + data.expires_in * 1000)

            // Відправляємо токен на клієнт через webContents
            win?.webContents.send('spotify-token', {
               access_token: data.access_token,
               expires_in: data.expires_in,
            })

            authWindow.close()
         } catch (error) {
            authWindow.close()
         }
      })
   }),

   getPlaylists: publicProcedure.query(() => prisma.spotifyPlaylist.findMany()),

   createPlaylist: publicProcedure.input(z.string()).mutation(async ({ input }) => {
      const { playlist } = await createAndSyncPlaylist(input)
      return playlist
   }),

   // TODO deletePlaylist cascade  delete tracks only in this playlist
   deletePlaylist: publicProcedure.input(z.string()).mutation(async ({ input }) => {
      await prisma.spotifyTrack.deleteMany({ where: { playlists: { some: { id: input } } } })
      await prisma.spotifyPlaylist.delete({ where: { id: input } })
   }),
})
