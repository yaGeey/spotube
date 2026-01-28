import { Route, Routes } from 'react-router-dom'
import Playlist from './routes/Playlist'
import Layout from './layout'
import Auth from './routes/Auth'
import Home from './routes/Home'
import AuthGenius from './routes/AuthGenius'
import SpotifyArtist from './routes/spotify/Artist'
import SpotifyAlbum from './routes/spotify/Album'
import SpotifySearch from './routes/spotify/Search'
function App() {
   return (
      <Routes>
         <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path=":id" element={<Playlist />} />
            <Route path="auth" element={<Auth />} />
            <Route path="auth-genius" element={<AuthGenius />} />
            <Route path="spotify">
               <Route path="search" element={<SpotifySearch />} />
               <Route path="album" element={<SpotifyAlbum />} />
               <Route path="artist" element={<SpotifyArtist />} />
            </Route>
         </Route>
      </Routes>
   )
}

export default App
