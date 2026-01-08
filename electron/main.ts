import { app, BrowserWindow, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath, URLSearchParams } from 'node:url'
import { ipcMain, dialog } from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import discordRpc from './ipc/discord-rpc'
import youtubeIpc from './ipc/yt'
import lastfmIpc from './ipc/lastfm'
import spotifyIpc from './ipc/spotify'
import aiIpc from './ipc/ai'
import youtubeScrapIpc from './ipc/yt-scrap'
import { logPrettyError } from './lib/axios'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
process.env.APP_ROOT = path.join(__dirname, '..')

const DiscordRPC = require('discord-rpc') as typeof import('discord-rpc')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

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
      win.loadURL(VITE_DEV_SERVER_URL)
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
   createWindow()

   discordRpc(new DiscordRPC.Client({ transport: 'ipc' }), ipcMain)
   youtubeIpc(ipcMain, store)
   spotifyIpc(ipcMain)
   lastfmIpc(ipcMain)
   aiIpc(ipcMain)
   youtubeScrapIpc(ipcMain)

   ipcMain.on('update-last-played', (event, id) => store.set('last-played', id))
})
