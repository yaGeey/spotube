import prisma from '@/electron/lib/prisma'
import { handlePagination } from '@/electron/lib/spotify'
import { router, spotifyOAuthProcedure } from '@/electron/trpc'
import { SpotifyPlaylistWithItems } from '@/src/types/types'
import { Page } from '@spotify/web-api-ts-sdk'
import { get } from 'node:http'
import z from 'zod'

export const spotifyOAuthRouter = router({
   addTracksToPlaylist: spotifyOAuthProcedure
      .input(z.object({ playlistId: z.string(), trackUris: z.array(z.string()) }))
      .mutation(async ({ input: { playlistId, trackUris }, ctx }) => {
         await ctx.sdk.playlists.addItemsToPlaylist(playlistId, trackUris)
      }),

   // TODO actually there is no need in this one, as playlist readds tracks every snapshot change
   // hovewer, in current implementation we have no orphaned tracks removal. ?Add it in procedure?
   deleteTracksFromPlaylist: spotifyOAuthProcedure
      .input(z.object({ playlistId: z.string(), tracksUris: z.array(z.string()) }))
      .mutation(async ({ input: { playlistId, tracksUris }, ctx }) => {
         // delete from spotify
         await ctx.sdk.playlists.removeItemsFromPlaylist(playlistId, {
            tracks: tracksUris.map((uri) => ({ uri })),
         })
         const ids = tracksUris.map((uri) => uri.split(':').pop() || '')
         // delete from playlist
         await prisma.playlistItem.deleteMany({
            where: {
               playlist: { spotifyMetadataId: playlistId },
               track: {
                  spotify: { id: { in: ids } },
               },
            },
         })
         // delete orphaned master tracks
         await prisma.masterTrack.deleteMany({
            where: {
               spotify: { id: { in: ids } },
               playlistItems: { none: {} },
            },
         })
      }),

   getProfile: spotifyOAuthProcedure.query(async ({ ctx }) => {
      // TODO handle term
      const topTracksRes = await ctx.sdk.currentUser.topItems('tracks')
      const topArtistsRes = await ctx.sdk.currentUser.topItems('artists')
      const profile = await ctx.sdk.currentUser.profile()
      const [topTracks, topArtists] = await Promise.all([handlePagination(topTracksRes), handlePagination(topArtistsRes)])
      return { profile, topTracks, topArtists }
   }),

   getPlaylists: spotifyOAuthProcedure.query(async ({ ctx }) => {
      const playlistsRes = await ctx.sdk.currentUser.playlists.playlists()
      return await handlePagination(playlistsRes)
   }),
   getFollowedArtists: spotifyOAuthProcedure.query(async ({ ctx }) => {
      const res = await ctx.sdk.currentUser.followedArtists()
      return await handlePagination(res.artists)
   }),
   getPlaylistById: spotifyOAuthProcedure.input(z.string()).query(async ({ input: playlistId, ctx }) => {
      const pl = await ctx.sdk.playlists.getPlaylist(playlistId)
      const items = await handlePagination(pl.tracks)
      return { ...pl, items } satisfies SpotifyPlaylistWithItems
   }),
   // TODO recommendations

   getRecentlyPlayedTracks: spotifyOAuthProcedure.query(async ({ ctx }) => {
      const res = await ctx.sdk.player.getRecentlyPlayedTracks()
      return await handlePagination(res as unknown as Page<SpotifyApi.PlayHistoryObject>)
   }),
   getCurrentTrack: spotifyOAuthProcedure.query(async ({ ctx }) => await ctx.sdk.player.getCurrentlyPlayingTrack()),
})
