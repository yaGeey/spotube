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

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('disk-cache-size', '0')
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
      // win?.webContents.send('main-process-message', new Date().toLocaleString())
   })

   if (VITE_DEV_SERVER_URL) {
      win.loadURL(VITE_DEV_SERVER_URL, { userAgent })
      win.webContents.openDevTools()
   } else {
      win.loadFile(path.join(RENDERER_DIST, 'index.html'))
   }
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
   // REQUEST HEADERS
   session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*', '*://*.google.com/*'] },
      (details, callback) => {
         const { requestHeaders, url, resourceType } = details
         const requestUrl = new URL(url)
         const clientName = requestUrl.searchParams.get('c')

         // skip modifying requests for IFrame (subFrame) and main page (mainFrame)
         if (resourceType === 'subFrame' || resourceType === 'mainFrame' || clientName === 'WEB_EMBEDDED_PLAYER') {
            callback({ cancel: false, requestHeaders })
            return
         }

         requestHeaders['User-Agent'] = userAgent
         requestHeaders['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
         requestHeaders['sec-ch-ua-mobile'] = '?0'
         requestHeaders['sec-ch-ua-platform'] = '"Windows"'

         delete requestHeaders['Sec-Electron-App-Version']
         delete requestHeaders['Sec-Electron-App-Name']

         // for BotGuardAPI we need to keep the original localhost Origin
         if (!requestUrl.pathname.includes('/api/jnn/')) {
            // for everything else (videos, images) - we are on youtube
            requestHeaders['Origin'] = 'https://www.youtube.com'
            requestHeaders['Referer'] = 'https://www.youtube.com/'
         }

         callback({ cancel: false, requestHeaders })
      },
   )

   // RESPONSE HEADERS
   // Тут ми лагодимо CORS, який виникне через те, що ми залишили рідний Origin для BotGuard
   session.defaultSession.webRequest.onHeadersReceived(
      { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*', '*://*.google.com/*'] },
      (details, callback) => {
         const { responseHeaders, url, resourceType } = details
         const headers = responseHeaders || {}
         const clientName = new URL(url).searchParams.get('c')

         // skip modifying headers for IFrame (subFrame) and main page (mainFrame)
         if (resourceType === 'subFrame' || resourceType === 'mainFrame' || clientName === 'WEB_EMBEDDED_PLAYER') {
            callback({ cancel: false, responseHeaders })
            return
         }

         // removing old CORS headers
         const keysToRemove = ['access-control-allow-origin', 'access-control-allow-credentials', 'access-control-allow-methods']
         Object.keys(headers).forEach((k) => {
            if (keysToRemove.includes(k.toLowerCase())) delete headers[k]
         })

         // Дозволяємо ВСЕ ("*") або конкретно наш Origin
         // Для BotGuard з credentials: 'include' зірочка * не працює, треба ехо-відповідь
         // Але Electron дозволяє схитрувати масивом
         headers['Access-Control-Allow-Origin'] = ['*']
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
