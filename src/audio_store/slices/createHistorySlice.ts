import { StateCreator } from 'zustand'
import { AudioStore, HistorySlice } from '../types'
import { toast } from 'react-toastify'
import { fromSpotifyToCurrent, ViewTrackModel } from '@/src/utils/currentTrackAdapters'
import { vanillaTrpc } from '@/src/utils/trpc'

type RandomType = null | 'true' | 'leastPlayedAllTime' | 'leastPlayedNow' | 'artists'
export const randomTypes = [null, 'true', 'artists'] as const satisfies RandomType[]

export const createHistorySlice: StateCreator<AudioStore, [], [], HistorySlice> = (set, get) => ({
   history: [],
   currentIndexAtHistory: -1,
   randomTypeIdx: 0,

   back: () => {
      const { history, play, currentIndexAtHistory } = get()
      const curIndex = currentIndexAtHistory - 1
      if (curIndex < 0) return toast.info('No previously played tracks')
      const prevTrack = history[curIndex]
      console.log('⏮️ Back to:', prevTrack, history, curIndex)
      set({ currentIndexAtHistory: curIndex })
      play({ track: prevTrack, skipHistory: true }) // skipHistory = true
   },

   next: async () => {
      const { history, play, currentIndexAtHistory, tracks, current, randomTypeIdx } = get()
      if (tracks.length === 0) return toast.info('No tracks in the playlist')

      // рухаємось по вже існуючій історії (наприклад, користувач натискав "Back")
      const nextIndex = currentIndexAtHistory + 1
      if (nextIndex < history.length) {
         const nextTrack = history[nextIndex]
         set({ currentIndexAtHistory: nextIndex })
         play({ track: nextTrack, skipHistory: true }) // skipHistory = true
         return
      }

      // Ми в кінці історії, треба обрати НОВИЙ трек
      let newTrack: ViewTrackModel | null = null
      const currentInListId = tracks.findIndex((t) => t.id === current?.id)

      let lastFMInfo
      const randomType = randomTypes[randomTypeIdx]
      switch (randomType) {
         case 'true':
            // true random. check to not repeat the same track
            {
               let newId = null
               do {
                  newId = Math.floor(Math.random() * tracks.length)
               } while (tracks.length > 1 && tracks[newId].id === current?.id)
               newTrack = tracks[newId]
            }
            break
         case 'artists':
            {
               const newId = Math.floor(Math.random() * tracks.length)
               try {
                  const artist = tracks[newId].artists[Math.floor(Math.random() * tracks[newId].artists.length)]
                  // TODO fetch new info for each artist, track, album
                  lastFMInfo = artist.lastFM
                  let artistId = artist.id
                  if (artist.source !== 'SPOTIFY') {
                     const artists = await vanillaTrpc.spotify.searchArtists.query(artist.name)
                     if (artists.length === 0) throw new Error('No artist found')
                     console.log('Found artists:', artists[0].name)
                     artistId = artists[0].id
                  }
                  
                  const albums = await vanillaTrpc.spotify.getArtistAlbums.query(artistId)
                  if (albums.length === 0) return toast.error('No albums found')
                  
                  const randomAlbum = albums[Math.floor(Math.random() * albums.length)]
                  const album = await vanillaTrpc.spotify.getAlbumWithTracks.query(randomAlbum.id)
                  if (album.tracks.length === 0) return toast.error('No tracks found in artist album for random selection')
                  
                  const randomTrack = album.tracks[Math.floor(Math.random() * album.tracks.length)]
                  newTrack = fromSpotifyToCurrent({...randomTrack, album: album as any})
               } catch (err) {
                  console.error('Error fetching artist tracks for random selection:', err)
                  newTrack = tracks[newId]
                  return toast.error('Error fetching artist tracks for random selection')
               }
            }
            break
         case null:
            // Перевіряємо, чи є наступний трек. Якщо ні - newTrack залишиться null
            if (currentInListId !== -1 && currentInListId < tracks.length - 1) {
               newTrack = tracks[currentInListId + 1]
            }
            break
         default:
            throw new Error(`${randomType satisfies never}`)
      }
      // Якщо плейлист закінчився і треку немає - нічого не робимо або зупиняємо
      if (!newTrack) return toast.info('End of playlist reached')

      play({ track: newTrack })
   },

   addToHistory: (track) => {
      const { history, currentIndexAtHistory } = get()
      // Логіка: відрізаємо "майбутнє", якщо ми були в минулому, і додаємо новий трек
      const newHistory = history.slice(0, currentIndexAtHistory + 1)
      newHistory.push(track)
      set({
         history: newHistory,
         currentIndexAtHistory: newHistory.length - 1,
      })
   },
   clearHistory: () => set({ history: [], currentIndexAtHistory: -1 }),
})
