import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { HashRouter } from 'react-router-dom'
import './globals.css'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { trpc } from './utils/trpc.ts'
import { ipcLink } from 'electron-trpc/renderer'
import superjson from 'superjson'
import 'react-toastify/dist/ReactToastify.css'
import 'shaka-player/dist/controls.css'
import { TRPCClientError } from '@trpc/client'

export const queryClient = new QueryClient({
   defaultOptions: {
      queries: {
         staleTime: Infinity,
         retry(failureCount, error) {
            if (error instanceof TRPCClientError) {
               const status = error.data?.httpStatus
               if (status && status >= 500) {
                  return failureCount < 3
               }
            }
            return false
         },
      },
   },
   queryCache: new QueryCache({
      onError: (error: any) => {
         console.log('query error:', error)
         toast.error(`An error occurred: ${error.message || 'Unknown error'}`)
      },
   }),
})
const trpcClient = trpc.createClient({
   links: [ipcLink()],
   transformer: superjson,
})

// Load react-scan in development
if (import.meta.env.DEV) {
   const script = document.createElement('script')
   script.src = 'https://unpkg.com/react-scan/dist/auto.global.js'
   script.async = true
   document.head.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
   <React.StrictMode>
      <HashRouter>
         <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
               <App />
               <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
         </trpc.Provider>
      </HashRouter>
   </React.StrictMode>,
)
