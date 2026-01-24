// TODO роізбратись що таке trpc
// npm install electron-trpc @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod
import { initTRPC } from '@trpc/server'
import chalk from 'chalk'
import { logPrettyError } from './lib/axios'
import superjson from 'superjson'

const t = initTRPC.create({
   isServer: true,
   transformer: superjson,
})

// Middleware для логування
const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
   const isDiscord = path.startsWith('discord')
   const start = Date.now()
   if (!isDiscord) console.log(chalk.gray(`-> [${type}] ${path}`))

   const result = await next()
   const duration = Date.now() - start

   if (!result.ok) {
      console.error(chalk.red.bold(`X [${type}] ${path} - ${duration}ms`))
      logPrettyError(result.error)
   } else {
      if (!isDiscord) console.log(chalk.green(`V [${type}] ${path} - ${duration}ms`))
   }

   return result
})

export const router = t.router
export const publicProcedure = t.procedure.use(loggingMiddleware)
