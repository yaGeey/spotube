import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './Home'
import Layout from './layout'
import Auth from './Auth'
import Test from './Test'

function App() {
   return (
      <Routes>
         <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="auth" element={<Auth />} />
            <Route path="test" element={<Test />} />
         </Route>
      </Routes>
   )
}

export default App
