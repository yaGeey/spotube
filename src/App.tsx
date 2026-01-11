import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Playlist from './routes/Playlist'
import Layout from './layout'
import Auth from './routes/Auth'
import Test from './Test'
import AIPage from './routes/AIData'
import Home from './routes/Home'

function App() {
   return (
      <Routes>
         <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path=":id" element={<Playlist />} />
            <Route path="auth" element={<Auth />} />
            <Route path="test" element={<Test />} />
            <Route path="ai" element={<AIPage />} />
         </Route>
      </Routes>
   )
}

export default App
