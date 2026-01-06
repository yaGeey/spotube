import prisma from '../lib/prisma'

export default function aiIpc(ipc: Electron.IpcMain) {
   ipc.handle('ai-get-music-cache', async (event, title: string, artist: string): Promise<PrismaJson.AiMusicData | undefined> => {
      const cached = await prisma.aiData.findFirst({ where: { title, artist } })
      if (cached) return cached.response
      return undefined
   })
   ipc.handle('ai-set-music-cache', async (event, data: PrismaJson.AiMusicData): Promise<void> => {
      await prisma.aiData.create({ data: { title: data.title, artist: data.artists[0].name, response: data } })
   })
}

declare global {
   namespace PrismaJson {
      export interface AiMusicData {
         title: string
         artists: {
            name: string
            role: string
            type: string
            originCountry: string
            yearsActive: string
            fullArticle: string
         }[]
         album: {
            title: string
            fullArticle: string
         }
         year: number
         source: string
         genre: {
            primary: string
            secondary: string[]
         }
         bpm: number
         themes: string[]
         moods: string[]
         instruments: string[]
         shortHook: string
         fullArticle: string
         similarTracks: {
            title: string
            artist: string
            reason: string
         }[]
      }
   }
}
