import { Page } from '@spotify/web-api-ts-sdk'
import api, { logPrettyError } from '../lib/axios'
import { win, store } from '../main'
import chalk from 'chalk'

export type AuthResponse = {
   access_token: string
   token_type: string
   scope: string
   expires_in: number
   refresh_token: string
}

export async function getSpotifyOAuthToken() {
   const access_token = store.get('spotify.access_token') as string | undefined
   const expires_at = store.get('spotify.expires_at') as number | undefined
   const refresh_token = store.get('spotify.refresh_token') as string | undefined

   // Перевіряємо чи токен ще валідний
   if (access_token && expires_at && Date.now() < expires_at && refresh_token) {
      return { access_token, expires_at, refresh_token }
   }

   // Якщо токен протермінований, оновлюємо його
   if (!refresh_token) {
      console.error(chalk.red('No refresh token available for Spotify'))
      return null
   }
   try {
      console.log(chalk.yellow('Refreshing Spotify token...'))
      const { data } = await api.post<AuthResponse>(
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
      store.set('spotify.refresh_token', data.refresh_token || refresh_token)
      return { ...data, expires_at: Date.now() + data.expires_in * 1000 }
   } catch (error) {
      logPrettyError(`Token refresh error: ${error}`)
      return null
   }
}

export async function getSpotifyCredentialsToken() {
   const token = store.get('spotify.credentials_token') as string | undefined
   const expiresAt = store.get('spotify.credentials_token_expires_at') as number | undefined

   if (token && expiresAt && Date.now() < expiresAt) return token
   try {
      console.log(chalk.yellow('Refreshing Spotify Credentials token...'))
      const { data } = await api.post(
         'https://accounts.spotify.com/api/token',
         new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
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
      store.set('spotify.credentials_token', data.access_token)
      store.set('spotify.credentials_token_expires_at', Date.now() + data.expires_in * 1000)
      return data.access_token as string
   } catch (error) {
      logPrettyError(`Credentials Token error: ${error}`)
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
   const accessToken = await getSpotifyCredentialsToken()
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

export const handlePagination = async <T>(page: Page<T>): Promise<T[]> => {
   const accessToken = await getSpotifyCredentialsToken()
   if (!accessToken) throw new Error('No Spotify access token available')

   const items = [...page.items]
   let pagingObject = page
   while (pagingObject.next) {
      console.log(pagingObject.next)
      const res = await api.get(pagingObject.next, {
         headers: { Authorization: `Bearer ${accessToken}` },
      })
      pagingObject = res.data
      items.push(...pagingObject.items)
   }
   // console.log(chalk.blue(`Fetched ${items.length} items.`))
   return items
}
