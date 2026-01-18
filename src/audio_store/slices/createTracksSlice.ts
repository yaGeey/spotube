import { StateCreator } from 'zustand'
import { AudioStore, PlayerSlice, TrackSlice } from '../types'
import { toast } from 'react-toastify'
import { trpc, vanillaTrpc } from '@/src/utils/trpc'
import { create } from 'mutative'
import updateTrackInQuery, { queryKey } from '@/src/utils/updateTrack'
import { queryClient } from '@/src/main'
import { PlaylistWithItems } from '@/electron/lib/prisma'

export const createTrackSlice: StateCreator<AudioStore, [], [], TrackSlice> = (set, get) => ({
   current: null,
   tracks: [],
   setTracks: (tracks) => set({ tracks }),
   isYtLoading: false,

   updateDefaultVideo: ({ track, youtubeVideoId }) => {
      if (!track.yt || !track.yt[0]) return console.warn('⚠️ No youtube video provided')
      if (youtubeVideoId && track.yt.length > 1 && track.spotify?.id) {
         // Update default video locally
         // TODO not working, as table not subscribed to store changes
         console.log('Updating default video locally and in DB...')
         set((p) =>
            create(p, (d) => {
               const trackToUpdate = d.tracks.find((t) => t.spotify?.id === track.spotify?.id)
               if (trackToUpdate && trackToUpdate.spotify) {
                  trackToUpdate.defaultYtVideoId = youtubeVideoId
               }
            })
         )

         // Update default video in database
         vanillaTrpc.tracks.updateDefaultVideo.mutate({
            trackId: track.id,
            youtubeVideoId,
         })

         toast.success('Default YouTube video updated')
      }
   },

   addYtVideoToTrack: ({ trackId, ytPayload }) => {
      const { playlistId } = get()
      if (!playlistId) return
      queryClient.setQueryData(queryKey(playlistId), (p: PlaylistWithItems | undefined) => {
         if (!p) return p
         return create(p, (d) => {
            const item = d?.playlistItems.find((i) => i.track.id === trackId)
            if (item) item.track.yt.push(ytPayload)
         })
      })
      set((p) =>
         create(p, (d) => {
            const track = d.tracks.find((t) => t.id === trackId)
            if (track) track.yt.push(ytPayload)
            if (d.current?.id === trackId) d.current.yt.push(ytPayload)
         })
      )
   },

   updateTrack: ({ masterId, data }) => {
      updateTrackInQuery({ playlistId: get().playlistId!, masterId, data })
      set((p) =>
         create(p, (d) => {
            const trackIndex = d.tracks.findIndex((t) => t.id === masterId)
            if (trackIndex !== -1) {
               d.tracks[trackIndex] = data
            }
            if (d.current?.id === masterId) {
               d.current = data
            }
         })
      )
   },
})
