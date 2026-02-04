import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAudioStore } from '../audio_store/useAudioStore'
import { trpc } from '../utils/trpc'
import SpotifyPlaylistTable from '../components/table/SpotifyPlaylistTable'
import VideoSlot from '../components/player/VideoSlot'

export default function PlaylistSpotify() {
   const { id } = useParams()
   if (!id) throw new Error('Playlist ID is required')
   useEffect(() => useAudioStore.setState({ playlistId: id }), [id])

   // TODO now only with ouath, add no oauth for not private playlists
   const playlistQuery = trpc.spotifyUser.getPlaylistById.useQuery(id)
   const pl = playlistQuery.data

   const snapshotQuery = trpc.spotify.getSnapshotId.useQuery(id, { refetchOnWindowFocus: true, refetchInterval: 1000 * 60 })
   useEffect(() => {
      if (pl && snapshotQuery.data && pl.snapshot_id !== snapshotQuery.data) {
         playlistQuery.refetch()
      }
   }, [snapshotQuery.data])

   return (
      <>
         <VideoSlot />
         {pl && <SpotifyPlaylistTable playlist={pl} />}
      </>
   )
}
