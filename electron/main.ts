import { app, BrowserWindow, shell, session } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath, URLSearchParams } from 'node:url'
import path from 'node:path'
import Store from 'electron-store'
import { logPrettyError } from './lib/axios'
import { createIPCHandler } from 'electron-trpc/main'
import { appRouter } from './api'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const userAgent =
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

export const store = new Store()
export let win: BrowserWindow | null

// Виправляємо проблеми з кешем
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('disk-cache-size', '0')
// 1. Вимикаємо детектор автоматизації (найважливіше для BotGuard)
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')

if (process.defaultApp) {
   if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('spotube', process.execPath, [path.resolve(process.argv[1])])
   }
} else {
   app.setAsDefaultProtocolClient('spotube')
}

if (process.platform === 'win32') {
   require('child_process').exec('chcp 65001')
}

function createWindow() {
   win = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
      webPreferences: {
         preload: path.join(__dirname, 'preload.mjs'),
         webSecurity: false, // Вимикаємо для CORS (потрібно для GoogleVideo)
         backgroundThrottling: false, // Додаткова маскування
         contextIsolation: true,
      },
   })
   win.webContents.setUserAgent(userAgent)

   // Test active push message to Renderer-process.
   win.webContents.on('did-finish-load', () => {
      // 3. Жорстко видаляємо webdriver з navigator (на випадок якщо прапорець вище не спрацював)
      win?.webContents.executeJavaScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      `)
      win?.webContents.send('main-process-message', new Date().toLocaleString())
   })

   if (VITE_DEV_SERVER_URL) {
      win.loadURL(VITE_DEV_SERVER_URL, { userAgent })
      win.webContents.openDevTools()
   } else {
      win.loadFile(path.join(RENDERER_DIST, 'index.html'))
   }

   // win.once('ready-to-show', () => {
   //    if (VITE_DEV_SERVER_URL) {
   //       win?.webContents.openDevTools({ mode: 'detach' })
   //    }
   // })
}

process.on('uncaughtException', (error) => {
   if (error.message.includes('Error occurred in handler')) return
   logPrettyError(error)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
   if (process.platform !== 'darwin') {
      app.quit()
      win = null
   }
})

app.on('activate', () => {
   // On OS X it's common to re-create a window in the app when the
   // dock icon is clicked and there are no other windows open.
   if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
   }
})

app.whenReady().then(() => {
   // --- 1. Фільтр ЗАПИТІВ (Request Headers) ---
   session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*', '*://*.google.com/*'] },
      (details, callback) => {
         const { requestHeaders, url } = details
         const requestUrl = new URL(url)

         // Встановлюємо правильний User-Agent (щоб приховати Electron)
         requestHeaders['User-Agent'] = userAgent

         // Емуляція Client Hints (як у робочому прикладі, Chrome 120+)
         requestHeaders['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
         requestHeaders['sec-ch-ua-mobile'] = '?0'
         requestHeaders['sec-ch-ua-platform'] = '"Windows"'

         // ВИДАЛЯЄМО паливні заголовки Electron
         delete requestHeaders['Sec-Electron-App-Version']
         delete requestHeaders['Sec-Electron-App-Name']

         // --- ГОЛОВНИЙ ФІКС ТУТ ---
         // Якщо це запит до BotGuard API -> НЕ чіпаємо Origin!
         // Нехай він буде таким, яким його бачить JS (localhost або file://)
         const isBotGuard = requestUrl.pathname.includes('/api/jnn/')

         if (!isBotGuard) {
            // Для всього іншого (відео, картинки) - брешемо, що ми на YouTube
            requestHeaders['Origin'] = 'https://www.youtube.com'
            requestHeaders['Referer'] = 'https://www.youtube.com/'
         } else {
            // Для BotGuard прибираємо примусові заголовки, якщо вони раптом додались
            // Але залишаємо Referer пустим або рідним, щоб не палитися
         }

         callback({ cancel: false, requestHeaders })
      },
   )

   // --- 2. Фільтр ВІДПОВІДЕЙ (Response Headers) ---
   // Тут ми лагодимо CORS, який виникне через те, що ми залишили рідний Origin для BotGuard
   session.defaultSession.webRequest.onHeadersReceived(
      { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*', '*://*.google.com/*'] },
      (details, callback) => {
         const headers = details.responseHeaders || {}

         // Видаляємо старі CORS заголовки
         const keysToRemove = ['access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods']
         Object.keys(headers).forEach((k) => {
            if (keysToRemove.includes(k.toLowerCase())) delete headers[k]
         })

         // Дозволяємо ВСЕ ("*") або конкретно наш Origin
         // Для BotGuard з credentials: 'include' зірочка * не працює, треба ехо-відповідь
         // Але Electron дозволяє схитрувати масивом
         headers['Access-Control-Allow-Origin'] = ['*']
         // Якщо * не спрацює з куками, спробуйте:
         // headers['Access-Control-Allow-Origin'] = [ 'http://localhost:5173' ]; // Або ваш поточний origin

         headers['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS, PUT, PATCH, DELETE']
         headers['Access-Control-Allow-Headers'] = ['*']
         headers['Access-Control-Allow-Credentials'] = ['true']

         callback({ cancel: false, responseHeaders: headers })
      },
   )

   createWindow()

   createIPCHandler({
      router: appRouter,
      windows: [win!],
   })
})
