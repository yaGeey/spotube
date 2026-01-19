import api, { logPrettyError } from '../lib/axios'
import { win, store } from '../main'
import chalk from 'chalk'

export async function getSpotifyToken(): Promise<{ access_token: string; expires_at: number } | null> {
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
      const { data } = await api.post(
         'https://accounts.spotify.com/api/token',
         new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
         }).toString(),
         {
            headers: {
               Authorization:
                  'Basic ' +
                  Buffer.from(`${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`).toString(
                     'base64',
                  ),
               'Content-Type': 'application/x-www-form-urlencoded',
            },
         },
      )

      // Зберігаємо новий токен
      store.set('spotify.access_token', data.access_token)
      store.set('spotify.expires_at', Date.now() + data.expires_in * 1000)

      return { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 }
   } catch (error) {
      logPrettyError(`Token refresh error: ${error}`)
      return null
   }
}

export async function searchSpotify({
   query,
   type,
   limit = 10,
}: {
   query: string
   type: 'album' | 'artist' | 'playlist' | 'track'
   limit?: number
}) {
   const accessToken = await getSpotifyToken().then((res) => res?.access_token)
   if (!accessToken) throw new Error('No Spotify access token available')

   const { data } = await api.get<SpotifyApi.SearchResponse>('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
         q: query,
         type,
         limit,
      },
   })
   return data[`${type}s`]
}
