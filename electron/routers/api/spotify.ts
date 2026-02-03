import z from 'zod'
import { publicProcedure, router, spotifyCredentialsProcedure, spotifyOAuthProcedure } from '../../trpc'
import { AuthResponse, handlePagination, searchSpotify } from '../../lib/spotify'
import api from '../../lib/axios'
import prisma, { deleteMasterTracksByPlaylistId, playlistWithDeepRelations, PlaylistWithItems } from '../../lib/prisma'
import chalk from 'chalk'
import { Prisma } from '@/generated/prisma/client'
import { chunkArray } from '@/utils/arrays'
import { SimplifiedAlbum, SimplifiedTrack } from '@spotify/web-api-ts-sdk'
import { win, store } from '@/electron/main'
import { BrowserWindow } from 'electron'

// const sdk = SpotifyApi.withClientCredentials(process.env.VITE_SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_SECRET!, [])

export const spotifyRouter = router({
   oauth: publicProcedure.mutation(async () => {
      // TODO https://developer.spotify.com/documentation/web-api/concepts/scopes#user-read-playback-state
      // user-read-playback-state - to sync on load
      // user-modify-playback-state / streaming - to control playback (PREMIUM)
      // user-follow-modify
      // user-read-recently-played - for history
      // user-follow-read + user-top-read + user-read-private - for user page
      // user-library-modify + user-library-read - for liked songs
      // user-read-private - Search for an Item
      // user-personalized
      const scope =
         'user-read-private playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-follow-modify user-follow-read user-top-read user-read-recently-played'
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
            // Якщо URL НЕ починається з нашого redirect_uri, це службовий перехід Spotify (логін -> підтвердження тощо).
            // Ми його ігноруємо і даємо вікну працювати далі.
            if (!url.startsWith(import.meta.env.VITE_REDIRECT_URI)) return
            ;(event as any).preventDefault()

            const code = new URL(url).searchParams.get('code')
            if (!code) throw new Error('❌ No code in redirect URL')

            const { data } = await api.post<AuthResponse>(
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
                           `${import.meta.env.VITE_SPOTIFY_CLIENT_ID}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`,
                        ).toString('base64'),
                     'Content-Type': 'application/x-www-form-urlencoded',
                  },
               },
            )
            console.log(data)

            // Зберігаємо токени в electron-store
            store.set('spotify.access_token', data.access_token)
            store.set('spotify.refresh_token', data.refresh_token)
            store.set('spotify.expires_in', Date.now() + data.expires_in * 1000)

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

   //
   upsertPlaylistWithTracks: spotifyCredentialsProcedure
      .input(z.string())
      .mutation(async ({ input: playlistId, ctx }): Promise<PlaylistWithItems> => {
         // fetch playlist with metadata
         const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            { headers: { Authorization: `Bearer ${ctx.token}` } },
         )

         // check for existing and return
         const existingPlaylist = await prisma.playlist.findUnique({
            where: { spotifyMetadataId: playlistRes.id },
            include: playlistWithDeepRelations,
         })
         if (existingPlaylist?.spotifyMetadata?.snapshotId === playlistRes.snapshot_id) {
            return existingPlaylist
         }
         console.log(chalk.blue(`Playlist outdated or new. Syncing...`))

         // upsert playlist
         const prismaPlaylist = await prisma.playlist.upsert({
            where: {
               spotifyMetadataId: playlistRes.id,
            },
            update: {
               title: playlistRes.name,
               description: playlistRes.description,
               thumbnailUrl: playlistRes.images[0]?.url,
               spotifyMetadata: {
                  update: {
                     snapshotId: playlistRes.snapshot_id,
                     fullResponse: playlistRes,
                  },
               },
            },
            create: {
               title: playlistRes.name,
               description: playlistRes.description,
               thumbnailUrl: playlistRes.images[0]?.url,
               origin: 'SPOTIFY',
               url: playlistRes.external_urls.spotify,
               spotifyMetadata: {
                  create: {
                     id: playlistRes.id,
                     fullResponse: playlistRes,
                     snapshotId: playlistRes.snapshot_id,
                  },
               },
            },
         })
         console.log(chalk.blue(`Upserted Spotify playlist ${playlistRes.name} (${playlistRes.id})`))

         // fetch tracks with pagination
         const tracks = await handlePagination<SpotifyApi.PlaylistTrackObject>(playlistRes.tracks)

         // check for existing master tracks to avoid duplicates
         const uniqueSpotifyIds = new Set(
            tracks.map((t) => t.track?.id).filter((id): id is string => typeof id === 'string' && id.length > 0),
         )

         // batching to avoid too many parameters error
         const chunked = chunkArray(Array.from(uniqueSpotifyIds), 500)
         const existingMasterTracks: { id: number; spotify: { id: string } | null }[] = []
         for (const chunk of chunked) {
            const result = await prisma.masterTrack.findMany({
               where: {
                  spotify: {
                     id: { in: chunk },
                  },
               },
               select: { id: true, spotify: { select: { id: true } } },
            })
            existingMasterTracks.push(...result)
         }
         // spotify track id -> master track
         const tracksMap = new Map(existingMasterTracks.map((t) => [t.spotify!.id, t.id]))

         // create other master track
         for (const item of tracks) {
            const id = item.track?.id
            if (id && item.track && !tracksMap.has(id)) {
               const newTrack = await prisma.masterTrack.create({
                  data: {
                     title: item.track.name,
                     artists: {
                        connectOrCreate: item.track.artists.map((artist) => ({
                           where: {
                              name_spotifyId_ytChannelId: {
                                 name: artist.name,
                                 spotifyId: artist.id,
                                 ytChannelId: '',
                              } satisfies Prisma.ArtistNameSpotifyIdYtChannelIdCompoundUniqueInput,
                           },
                           create: { name: artist.name, spotifyId: artist.id },
                        })),
                     },
                     thumbnailUrl: item.track.album.images[0]?.url,
                     spotify: {
                        //TODO connect because spotifyTrack can already exist as orphaned record (fix this)
                        connectOrCreate: {
                           where: { id },
                           create: {
                              id,
                              title: item.track.name,
                              fullResponse: item.track,
                           },
                        },
                     },
                  } satisfies Prisma.MasterTrackCreateInput,
               })
               tracksMap.set(id, newTrack.id)
            }
         }

         await prisma.$transaction([
            // clear existing playlist items (spotify playlist containt addet_at, it's not ours)
            prisma.playlistItem.deleteMany({
               where: { playlistId: prismaPlaylist.id },
            }),

            // create playlist items
            prisma.playlistItem.createMany({
               data: tracks
                  .map((item, index) => {
                     const mTrackId = tracksMap.get(item.track?.id || '')
                     if (!mTrackId) return null
                     return {
                        playlistId: prismaPlaylist.id,
                        addedAt: item.added_at ? new Date(item.added_at) : new Date(),
                        trackId: mTrackId,
                        position: index,
                     } satisfies Prisma.PlaylistItemCreateManyInput
                  })
                  .filter((t) => t !== null),
            }),
         ])

         // fetch and return the complete playlist with all relations
         const completePlaylist = await prisma.playlist.findUniqueOrThrow({
            where: { id: prismaPlaylist.id },
            include: playlistWithDeepRelations,
         })

         return completePlaylist
      }),

   // lightweight fetch
   getSnapshotId: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: playlistId, ctx }) => {
      const { data } = await api.get<Pick<SpotifyApi.SinglePlaylistResponse, 'snapshot_id'>>(
         `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,snapshot_id`,
         { headers: { Authorization: `Bearer ${ctx.token}` } },
      )
      return data.snapshot_id
   }),

   getPlaylists: publicProcedure.query(async () => {
      const playlists = await prisma.playlist.findMany({
         where: {
            origin: 'SPOTIFY',
         },
         include: playlistWithDeepRelations,
         orderBy: { createdAt: 'desc' },
      })
      return playlists
   }),

   deletePlaylist: publicProcedure.input(z.string()).mutation(async ({ input: spotifyId }) => {
      return await prisma.$transaction(async (tx) => {
         const playlist = await tx.playlist.findUniqueOrThrow({
            where: { spotifyMetadataId: spotifyId },
         })
         console.log(chalk.blue(`Deleting playlist ${playlist.title}`))

         // delete SpotifyPlaylist -> Playlist -> PlaylistItem
         await tx.spotifyPlaylist.deleteMany({
            where: { id: spotifyId },
         })
         await deleteMasterTracksByPlaylistId(playlist.id, tx)
      })
   }),

   searchPlaylists: publicProcedure
      .input(z.string())
      .query(async ({ input: query }) => await searchSpotify({ query, type: 'playlist' })),
   searchTracks: publicProcedure.input(z.string()).query(async ({ input: query }) => {
      await searchSpotify({ query, type: 'track' })
   }),

   searchArtists: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: query, ctx }) => {
      const res = await ctx.sdk.search(query, ['artist'])
      return res.artists.items
   }),
   getFullArtist: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: artistId, ctx }) => {
      const artist = await ctx.sdk.artists.get(artistId)
      const topTracks = await ctx.sdk.artists.topTracks(artistId, 'US')
      // const related = await sdk.artists.relatedArtists(artistId)
      const albumsPage = await ctx.sdk.artists.albums(artistId)
      const albums = await handlePagination<SimplifiedAlbum>(albumsPage)
      return {
         artist,
         topTracks: topTracks.tracks,
         // related: related.artists,
         albums,
      }
   }),
   getAlbumWithTracks: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: albumId, ctx }) => {
      const album = await ctx.sdk.albums.get(albumId)
      const tracksPage = await ctx.sdk.albums.tracks(albumId)
      const tracks = await handlePagination<SimplifiedTrack>(tracksPage)
      return {
         ...album,
         tracks,
      }
   }),
   getAllArtistTracks: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: artistId, ctx }) => {
      const albumsPage = await ctx.sdk.artists.albums(artistId)
      const albums = await handlePagination<SimplifiedAlbum>(albumsPage)
      const allTracks: SimplifiedTrack[] = []
      for (const album of albums) {
         const tracksPage = await ctx.sdk.albums.tracks(album.id)
         const tracks = await handlePagination<SimplifiedTrack>(tracksPage)
         allTracks.push(...tracks)
      }
      return allTracks
   }),
   getArtistAlbums: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: artistId, ctx }) => {
      const albumsPage = await ctx.sdk.artists.albums(artistId)
      const albums = await handlePagination<SimplifiedAlbum>(albumsPage)
      console.log(chalk.blue(`Fetched ${albums.length} albums for artist ${artistId}`))
      return albums
   }),
   getPlaylistById: spotifyCredentialsProcedure.input(z.string()).query(async ({ input: playlistId, ctx }) => {
      const pl = await ctx.sdk.playlists.getPlaylist(playlistId)
      const tracks = await handlePagination(pl.tracks)
      return { ...pl, tracks }
   }),
})
