import api, { logPrettyError } from '../lib/axios'
import { win, store } from '../main'
import chalk from 'chalk'
import axios from 'axios'
import prisma from './prisma'

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
                     'base64'
                  ),
               'Content-Type': 'application/x-www-form-urlencoded',
            },
         }
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

// TODO Metadata Sync
export async function createAndSyncPlaylist(playlistId: string) {
   const accessToken = await getSpotifyToken().then((res) => res?.access_token)
   if (!accessToken) throw new Error('No Spotify access token available')

   // fetch playlist with metadata
   const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
         headers: { Authorization: `Bearer ${accessToken}` },
      }
   )

   let playlist = await prisma.spotifyPlaylist.findUnique({
      where: { id: playlistRes.id },
   })
   if (!playlist) {
      playlist = await prisma.spotifyPlaylist.create({
         data: {
            id: playlistRes.id,
            title: playlistRes.name,
            owner: playlistRes.owner.display_name || 'Unknown Owner',
            thumbnailUrl: playlistRes.images[0]?.url,
            snapshotId: playlistRes.snapshot_id,
            fullResponse: playlistRes,
            url: playlistRes.external_urls.spotify,
         },
      })
   }
   
   return {playlist, playlistRes, accessToken}
}

export async function searchSpotify({query, type,limit=10}:{query: string, type: "album" | "artist" | "playlist" | "track", limit?: number}) {
   const accessToken = await getSpotifyToken().then((res) => res?.access_token)
   if (!accessToken) throw new Error('No Spotify access token available')
   
   const { data } = await api.get<SpotifyApi.SearchResponse>('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
         q: query,
         type,
         limit
      }
   })
   return data[`${type}s`]
}