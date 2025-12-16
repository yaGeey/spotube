import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { HashRouter } from 'react-router-dom'
import './globals.css'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
   queryCache: new QueryCache({
      onError: (error: any) => {
         toast.error(`An error occurred: ${error.message || 'Unknown error'}`)
      },
   }),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
   <React.StrictMode>
      <HashRouter>
         <QueryClientProvider client={queryClient}>
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
         </QueryClientProvider>
      </HashRouter>
   </React.StrictMode>
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
   console.log(message)
})
