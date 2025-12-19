import axios from 'axios'
import chalk from 'chalk'
chalk.level = 3 // for Windows Terminal

export function logPrettyError(error: unknown) {
   if (axios.isAxiosError(error)) {
      // Check if it's a response error (4xx, 5xx)
      if (error.response) {
         console.error(chalk.red(`${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`))
         console.error(chalk.gray(JSON.stringify(error.response.data, null, 2)))
      }
      // Check if it's a network error (no response)
      else if (error.request) {
         console.error(chalk.red.underline('\nNetwork Error: No response received.'))
         console.error(chalk.red(`${error.config?.method?.toUpperCase()} ${error.config?.url}`))
         console.error(chalk.red(error.message))
      }
      // Other errors (e.g., config error)
      else {
         console.error(chalk.red.underline('Axios Setup Error'))
         console.error(chalk.red(error.message))
      }
   } else {
      // Not an Axios error
      if (error instanceof Error) {
         // console.error(chalk.red.underline(error.message))
         // console.error(chalk.red(error.stack))
         console.error(chalk.red(error.message))
         console.error(chalk.gray(error.stack?.split('\n')[1]))
         return
      } else {
         console.error(chalk.red.underline('An unexpected non-error object was thrown:'))
         console.error(chalk.gray(JSON.stringify(error, null, 2)))
         return
      }
   }
}

const api = axios.create({
   // headers: {
   //    'User-Agent': 'Spotube',
   // },
})
api.interceptors.response.use(
   (response) => response,
   (error) => {
      logPrettyError(error)
      return Promise.reject(error)
   }
)
export default api
