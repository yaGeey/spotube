import { createTRPCProxyClient, createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../electron/api' // Імпортуємо тільки тип!
import { ipcLink } from 'electron-trpc/renderer'
import superjson from 'superjson'

export const trpc = createTRPCReact<AppRouter>()
export const vanillaTrpc = createTRPCProxyClient<AppRouter>({
   links: [ipcLink()],
   transformer: superjson,
})
