import { app, BrowserWindow, shell, session } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath, URLSearchParams } from 'node:url'
import { ipcMain, dialog } from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import youtubeIpc from './ipc/yt'
import lastfmIpc from './ipc/lastfm'
import spotifyIpc from './ipc/spotify'
import aiIpc from './ipc/ai'
import youtubeScrapIpc from './ipc/yt-scrap'
import { logPrettyError } from './lib/axios'
import { createIPCHandler } from 'electron-trpc/main'
import { appRouter } from './api'
import { Innertube, UniversalCache } from 'youtubei.js'

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
      },
   })

   // Test active push message to Renderer-process.
   win.webContents.on('did-finish-load', () => {
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
   // Set up session headers before creating window
   // session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
   //    details.requestHeaders['User-Agent'] = userAgent
   //    details.requestHeaders['Referer'] = 'https://www.youtube.com/'
   //    callback({ cancel: false, requestHeaders: details.requestHeaders })
   // })

   createWindow()

   createIPCHandler({
      router: appRouter,
      windows: [win!],
   })
})
