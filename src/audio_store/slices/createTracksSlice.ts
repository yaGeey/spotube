import { StateCreator } from 'zustand'
import { AudioStore, TrackSlice } from '../types'
import { toast } from 'react-toastify'
import { vanillaTrpc } from '@/src/utils/trpc'
import { create } from 'mutative'
import { queryKey } from '@/src/utils/updateTrack'
import { queryClient } from '@/src/main'
import { PlaylistWithItems } from '@/electron/lib/prisma'

export const createTrackSlice: StateCreator<AudioStore, [], [], TrackSlice> = (set, get) => ({
   current: null,
   tracks: [],
   setTracks: (tracks) => set({ tracks }),
   isYtLoading: false,

   updateDefaultVideo: ({ track, youtubeVideoId }) => {
      if (!track.yt || !track.yt[0]) return console.warn('⚠️ No youtube video provided')
      if (youtubeVideoId && track.yt.length > 1 && track.source === 'LOCAL') {
         // Update default video locally
         // TODO not working, as table not subscribed to store changes
         console.log('Updating default video locally and in DB...')
         set((p) =>
            create(p, (d) => {
               const trackToUpdate = d.tracks.find((t) => t.id === track.id)
               if (trackToUpdate) {
                  trackToUpdate.defaultYtVideoId = youtubeVideoId
               }
            }),
         )

         // Update default video in database
         vanillaTrpc.tracks.updateDefaultVideo.mutate({
            trackId: track.id,
            youtubeVideoId,
         })

         toast.success('Default YouTube video updated')
      }
   },

   addYtToTrackInPlaylistQuery: ({ trackId, ytPayload }) => {
      const { playlistId } = get()
      if (!playlistId) return
      queryClient.setQueryData(queryKey(playlistId), (p: PlaylistWithItems | undefined) => {
         if (!p) return p
         return create(p, (d) => {
            const item = d?.playlistItems.find((i) => i.track.id === trackId)
            if (item) item.track.yt.push(ytPayload)
         })
      })
   },
   addYtToTrackInStore: ({ trackId, ytPayload }) => {
      set((p) =>
         create(p, (d) => {
            const track = d.tracks.find((t) => t.id === trackId)
            if (track) track.yt.push(ytPayload)
            if (d.current && d.current?.id === trackId) d.current.yt.push(ytPayload)
         }),
      )
   },
})
