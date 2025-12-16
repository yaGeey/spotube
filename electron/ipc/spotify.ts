import { BrowserWindow } from 'electron'
import api from '../lib/axios'
import { win, store } from '../main'
import chalk from 'chalk'
import axios from 'axios'
import { dbInsertSpotifyTrack, getSpotifyTracksByPlaylistIDQuery } from '../lib/db/db-spotify'
import { PlaylistItem } from '@/src/types/spotify'
import { DB } from '@/src/types/types'

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

   ipcMain.handle('get-spotify-playlist', async (event, playlistId: string, update: boolean = false) => {
      // load from cache
      // if (store.get(`spotify.playlists.${playlistId}.items`) && !update) {
      //    console.log('Cache hit for Spotify playlist', playlistId)
      //    return store.get(`spotify.playlists.${playlistId}.items`)
      // }
      // store.delete(`spotify.playlists.${playlistId}.items`)
      // const playlistCached = getSpotifyPlaylistByIDQuery(playlistId)
      // if (!playlistCached) {
      //    console.log(chalk.yellow('No cached playlist', playlistId))
      //    createSpotifyPlaylistByIDQuery(playlistId)
      // }
      const cached = getSpotifyTracksByPlaylistIDQuery.all(playlistId) as DB['spotify'][]
      if (cached && cached.length > 0 && !update) {
         console.log(chalk.green('Cache hit for Spotify playlist', playlistId))
         return cached.map((item) => JSON.parse(item.full_response))
      }

      // TODO snapshot test from spotify api
      const isNewSnapshot = true

      // fetch from API
      const accessToken = await getSpotifyToken().then((res) => res?.access_token)
      const res = await api.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
         headers: { Authorization: `Bearer ${accessToken}` },
      })
      let data = res.data

      // pagination
      const tracks: PlaylistItem[] = [...data.items]
      while (data.next) {
         const res = await api.get(data.next, {
            headers: { Authorization: `Bearer ${accessToken}` },
         })
         data = res.data
         tracks.push(...data.items)
      }

      // remove available_markets field
      const newTracks = tracks.map((item) => {
         const { track, ...restOfItem } = item
         const { available_markets, album, ...restOfTrack } = track
         const { available_markets: _, ...restOfAlbum } = album
         return {
            ...restOfItem,
            track: {
               ...restOfAlbum,
               ...restOfTrack,
            },
         }
      })

      // store.set(`spotify.playlists.${playlistId}.items`, newTracks)
      for (const t of newTracks) {
         dbInsertSpotifyTrack(playlistId, {
            id: t.track.id,
            title: t.track.name,
            artist: t.track.artists[0].name, // TODO
            full_response: t,
         })
      }
      return newTracks
   })
}
