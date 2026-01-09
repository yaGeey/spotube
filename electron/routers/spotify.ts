import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '../lib/prisma'
import { getSpotifyToken } from '../lib/spotify'
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
      const accessToken = await getSpotifyToken().then((res) => res?.access_token)
      if (!accessToken) throw new Error('No Spotify access token available')

      // fetch playlist with metadata
      const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(`https://api.spotify.com/v1/playlists/${input}`, {
         headers: { Authorization: `Bearer ${accessToken}` },
      })

      // create playlist in db if not exists
      let playlist = await prisma.spotifyPlaylist.findUnique({
         where: { id: playlistRes.id },
      })
      if (!playlist) {
         playlist = await prisma.spotifyPlaylist.create({
            data: {
               id: playlistRes.id,
               title: playlistRes.name,
               owner: playlistRes.owner.display_name || 'Unknown Owner',
               thumbnail_url: playlistRes.images[0]?.url,
               snapshot_id: playlistRes.snapshot_id,
               url: playlistRes.external_urls.spotify,
            },
         })
         console.log(chalk.blue(`Spotify playlist created ${input}`))
      } else if (playlist.snapshot_id === playlistRes.snapshot_id) {
         // if snapshot is the same, return cached tracks
         const cachedTracks = await prisma.spotifyTrack.findMany({
            where: { playlists: { some: { id: playlist.id } } },
         })
         return {
            ...playlist,
            items: cachedTracks,
         } satisfies SpotifyPlaylistResponse
      }

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
                  artist: item.track.artists.map((artist) => artist.name).join(', '),
                  playlists: { connect: { id: playlist!.id } },
               },
            })
         })
         .filter((op) => op !== null)
      const tracksPrisma = await prisma.$transaction(operations)

      // update snapshot id
      playlist = await prisma.spotifyPlaylist.update({
         where: { id: playlist.id },
         data: { snapshot_id: playlistRes.snapshot_id },
      })

      return {
         ...playlist,
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
                        Buffer.from(`${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`).toString(
                           'base64'
                        ),
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
})
