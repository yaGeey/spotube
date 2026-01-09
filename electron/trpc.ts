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
const loggingMiddleware = t.middleware(async ({ path, type, next, input }) => {
   const start = Date.now()
   const inputLog = typeof input === 'object' ? JSON.stringify(input) : input
   console.log(chalk.gray(`-> [${type}] ${path} - ${inputLog}`))

   const result = await next()
   const duration = Date.now() - start

   if (!result.ok) {
      console.error(chalk.red(`X [${type}] ${path} - ${duration}ms`), result.error)
      logPrettyError(result.error)
   } else {
      console.log(chalk.green(`V [${type}] ${path} - ${duration}ms`))
   }

   return result
})

export const router = t.router
export const publicProcedure = t.procedure.use(loggingMiddleware)
