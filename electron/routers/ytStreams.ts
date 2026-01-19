import { publicProcedure, router } from '../trpc'
import z from 'zod'
import Innertube, { UniversalCache, ClientType, Platform, Types, Utils } from 'youtubei.js'
// import { Constants, Innertube, Platform, UniversalCache, Utils, YT, Types } from 'youtubei.js/web'

Platform.shim.eval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
   const properties = []

   if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`)
   if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`)

   const code = `${data.output}\nreturn { ${properties.join(', ')} }`
   return new Function(code)()
}

let yt: Innertube | null = null
async function getInnertube() {
   if (yt) return yt
   yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true,
      // fetch: fetchFunction,
   })
   return yt
}

export const ytStreamsRouter = router({
   getAudioStream: publicProcedure
      .input(z.object({ id: z.string(), type: z.enum(['video', 'audio', 'video+audio']) }))
      .mutation(async ({ input }) => {
         const yt = await getInnertube()
         const info = await yt.getInfo(input.id)

         const format = info.chooseFormat({
            type: input.type,
            quality: 'best',
         })

         if (!format) {
            throw new Error('Формат не знайдено')
         }

         console.dir(format, { depth: null })
         let streamUrl = format.url

         if (!streamUrl) {
            streamUrl = await format.decipher(yt.session.player)
         }

         console.log('Direct Stream URL:', streamUrl)

         // Зберігаємо URL для proxy
         const proxyId = Buffer.from(streamUrl).toString('base64url')

         return {
            url: streamUrl,
            proxyUrl: `http://localhost:${process.env.PORT || 3000}/proxy/${proxyId}`,
            title: info.basic_info.title,
            duration: info.basic_info.duration,
            thumbnail: info.basic_info.thumbnail?.[0]?.url,
         }
      }),
})
