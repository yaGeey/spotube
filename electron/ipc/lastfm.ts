import api from '../lib/axios'

export default function lastfmIpc(ipcMain: Electron.IpcMain) {
   ipcMain.handle('get-lastfm-track', async (event, params: { artist: string; track: string }[]) => {
      const data = await Promise.all(
         params.map(async (query) => {
            console.log(query, 'track.getInfo')
            const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
               params: {
                  method: 'track.getInfo',
                  api_key: import.meta.env.VITE_LASTFM_API_KEY,
                  artist: query.artist,
                  track: query.track,
                  format: 'json',
               },
            })
            return data.track || null
         })
      )
      return data
   })

   ipcMain.handle('get-lastfm-album', async (event, params: { artist: string; album: string }[]) => {
      const data = await Promise.all(
         params.map(async (query) => {
            console.log(query, 'album.getInfo')
            const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
               params: {
                  method: 'album.getInfo',
                  api_key: import.meta.env.VITE_LASTFM_API_KEY,
                  artist: query.artist,
                  album: query.album,
                  format: 'json',
               },
            })
            return data.album || null
         })
      )
      return data
   })

   ipcMain.handle('get-lastfm-artist', async (event, params: { artist: string }[]) => {
      const data = await Promise.all(
         params.map(async (query) => {
            console.log(query, 'artist.getInfo')
            const { data } = await api.get('http://ws.audioscrobbler.com/2.0/', {
               params: {
                  method: 'artist.getInfo',
                  api_key: import.meta.env.VITE_LASTFM_API_KEY,
                  artist: query.artist,
                  format: 'json',
               },
            })
            return data.artist || null
         })
      )
      return data
   })
}
