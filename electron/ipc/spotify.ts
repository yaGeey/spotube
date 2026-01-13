import { BrowserWindow } from 'electron'
import api, { logPrettyError } from '../lib/axios'
import { win, store } from '../main'
import chalk from 'chalk'
import axios from 'axios'
import prisma from '../lib/prisma'
import { SpotifyPlaylist, SpotifyTrack } from '@/generated/prisma/client'

async function getSpotifyToken(): Promise<{ access_token: string; expires_at: number } | null> {
   const token = store.get('spotify.access_token') as string | undefined
   const expiresAt = store.get('spotify.expires_at') as number | undefined
   const refresh_token = store.get('spotify.refresh_token') as string | undefined

   // Перевіряємо чи токен ще валідний
   if (token && expiresAt && Date.now() < expiresAt) {
      return { access_token: token, expires_at: expiresAt }
   }

   // Якщо токен протермінований, оновлюємо його
   if (!refresh_token) return null
   try {
      console.log(chalk.yellow('Refreshing Spotify token...'))
      const { data } = await axios.post(
         'https://accounts.spotify.com/api/token',
         new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
         }).toString(),
         {
            headers: {
               Authorization:
                  'Basic ' +
                  Buffer.from(`${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`).toString('base64'),
               'Content-Type': 'application/x-www-form-urlencoded',
            },
         }
      )

      // Зберігаємо новий токен
      store.set('spotify.access_token', data.access_token)
      store.set('spotify.expires_at', Date.now() + data.expires_in * 1000)

      return { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 }
   } catch (error) {
      console.error('Token refresh error:', error)
      return null
   }
}

export type SpotifyPlaylistResponse = SpotifyPlaylist & { items: SpotifyTrack[] }

export default function spotifyIpc(ipcMain: Electron.IpcMain) {
   ipcMain.on('spotify-login', async () => {
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

            // Зберігаємо токени в electron-store (зберігається назавжди)
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
   })

   ipcMain.handle('get-spotify-playlist', async (event, playlistId: string): Promise<SpotifyPlaylistResponse | undefined> => {
      try {
         const accessToken = await getSpotifyToken().then((res) => res?.access_token)
         if (!accessToken) throw new Error('No Spotify access token available')

         // fetch playlist with metadata
         // const { data: playlistRes } = await api.get<PrismaJson.SpotifyPlaylistResponse>(
         const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            {
               headers: { Authorization: `Bearer ${accessToken}` },
            }
         )

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
            console.log(chalk.green(`Spotify playlist created ${playlistId}`))
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

         // remove available_markets field
         // const filteredTracks = tracks
         //    .map((item) => {
         //       const { track, ...restOfItem } = item
         //       if (!track || !track.id) return // check for local or unavailable tracks
         //       const album = track.album || {}
         //       const { available_markets, ...restOfTrack } = track
         //       const { available_markets: _, ...restOfAlbum } = album as Album & { available_markets?: string[] }
         //       return {
         //          ...restOfItem,
         //          track: {
         //             ...restOfTrack,
         //             album: restOfAlbum,
         //          },
         //       } satisfies PrismaJson.SpotifyPlaylistItem
         //    })
         //    .filter((item) => item !== undefined)

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
         playlist = await prisma.spotifyPlaylist.update({
            where: { id: playlist.id },
            data: { snapshot_id: playlistRes.snapshot_id },
         })

         return {
            ...playlist,
            items: tracksPrisma,
         } satisfies SpotifyPlaylistResponse
      } catch (error) {
         logPrettyError(error)
      }
   })

   ipcMain.handle('update-spotify-default-yt-video', async (event, spotifyTrackId: string, youtubeVideoId: string) => {
      console.log(chalk.cyan(youtubeVideoId))
      try {
         await prisma.spotifyTrack.update({
            where: { id: spotifyTrackId },
            data: {
               default_yt_video: { connect: { id: youtubeVideoId } },
            },
         })
         console.log(chalk.green(`Set default YT video ${youtubeVideoId} for Spotify track ${spotifyTrackId}`))
      } catch (err) {
         logPrettyError(err)
      }
   })
}
