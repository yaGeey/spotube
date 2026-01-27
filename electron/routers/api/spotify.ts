import z from 'zod'
import { publicProcedure, router } from '../../trpc'
import { getSpotifyToken, searchSpotify } from '../../lib/spotify'
import api from '../../lib/axios'
import prisma, { playlistWithDeepRelations, PlaylistWithItems } from '../../lib/prisma'
import chalk from 'chalk'
import { PlaylistItem, Prisma } from '@/generated/prisma/client'
import { chunkArray } from '@/utils/arrays'
import { Album, Artist, Page, SimplifiedAlbum, SimplifiedTrack, SpotifyApi } from '@spotify/web-api-ts-sdk'

console.log(process.env.VITE_SPOTIFY_CLIENT_ID, process.env.SPOTIFY_SECRET)
const sdk = SpotifyApi.withClientCredentials(process.env.VITE_SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_SECRET!, [])

export const spotifyRouter = router({
   upsertPlaylistWithTracks: publicProcedure
      .input(z.string())
      .mutation(async ({ input: playlistId }): Promise<PlaylistWithItems> => {
         const accessToken = await getSpotifyToken().then((res) => res?.access_token)
         if (!accessToken) throw new Error('No Spotify access token available')

         // lightweight fetch to check for snapshot_id
         const { data: minimalMeta } = await api.get<SpotifyApi.SinglePlaylistResponse>(
            `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,snapshot_id,name,description,images,external_urls`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
         )

         // check for existing and return
         const existingPlaylist = await prisma.playlist.findUnique({
            where: { spotifyMetadataId: minimalMeta.id },
            include: playlistWithDeepRelations,
         })
         if (existingPlaylist?.spotifyMetadata?.snapshotId === minimalMeta.snapshot_id) {
            return existingPlaylist
         }
         console.log(chalk.blue(`Playlist outdated or new. Syncing...`))

         // fetch playlist with metadata
         const { data: playlistRes } = await api.get<SpotifyApi.SinglePlaylistResponse>(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
         )

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
         console.log(chalk.blue(`Deleting Spotify playlist ${playlist.title} (${spotifyId})`))

         const tracksToDelete = await tx.masterTrack.findMany({
            where: {
               playlistItems: {
                  every: { playlistId: playlist.id },
                  some: { playlistId: playlist.id },
               },
            },
         })
         console.log(
            chalk.blue(`Found ${tracksToDelete.length} tracks to delete (${tracksToDelete.map((t) => t.id).join(', ')})`),
         )

         // delete SpotifyPlaylist -> Playlist -> PlaylistItem
         await tx.spotifyPlaylist.deleteMany({
            where: { id: spotifyId },
         })

         // delete MasterTracks
         if (!tracksToDelete.length) return
         await tx.masterTrack.deleteMany({
            where: {
               id: { in: tracksToDelete.map((t) => t.id) },
            },
         })
      })
   }),

   searchPlaylists: publicProcedure
      .input(z.string())
      .query(async ({ input: query }) => await searchSpotify({ query, type: 'playlist' })),
   searchTracks: publicProcedure.input(z.string()).query(async ({ input: query }) => {
      await searchSpotify({ query, type: 'track' })
   }),

   searchArtists: publicProcedure.input(z.string()).query(async ({ input: query }) => {
      const res = await sdk.search(query, ['artist'])
      return res.artists.items
   }),
   getFullArtist: publicProcedure.input(z.string()).query(async ({ input: artistId }) => {
      const artist = await sdk.artists.get(artistId)
      const topTracks = await sdk.artists.topTracks(artistId, 'US')
      // const related = await sdk.artists.relatedArtists(artistId)
      const albumsPage = await sdk.artists.albums(artistId)
      const albums = await handlePagination<SimplifiedAlbum>(albumsPage)
      return {
         artist,
         topTracks: topTracks.tracks,
         // related: related.artists,
         albums,
      }
   }),
   getAlbumWithTracks: publicProcedure.input(z.string()).query(async ({ input: albumId }) => {
      const album = await sdk.albums.get(albumId)
      const tracksPage = await sdk.albums.tracks(albumId)
      const tracks = await handlePagination<SimplifiedTrack>(tracksPage)
      return {
         ...album,
         tracks,
      }
   }),
})

const handlePagination = async <T>(page: Page<T>): Promise<T[]> => {
   const accessToken = await getSpotifyToken().then((res) => res?.access_token)
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
   console.log(chalk.blue(`Fetched ${items.length} items.`))
   return items
}
