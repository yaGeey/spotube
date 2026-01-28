import z from 'zod'
import { publicProcedure, router } from '../trpc'
import { shell } from 'electron'
import type { WebPoSignalOutput } from 'bgutils-js'
import { BG, buildURL, GOOG_API_KEY, USER_AGENT } from 'bgutils-js'
import { Innertube } from 'youtubei.js'
import { JSDOM } from 'jsdom'

const originalConsoleError = console.error
console.error = (...args: any[]) => {
   if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext')
   ) {
      return
   }
   originalConsoleError.apply(console, args)
}

let innertube: Innertube | null = null
async function getInnertube() {
   if (innertube) return innertube

   console.log('[Main] Creating new Innertube instance...')
   innertube = await Innertube.create({
      user_agent: USER_AGENT,
      enable_session_cache: true, // Вмикаємо кеш, щоб зберігати сесію в пам'яті
   })
   return innertube
}

export const systemRouter = router({
   openExternalLink: publicProcedure.input(z.string()).mutation(async ({ input: url }) => {
      await shell.openExternal(url)
   }),

   getYtIntegrityToken: publicProcedure.input(z.string()).mutation(async ({ input: videoId }) => {
      const innertube = await getInnertube()
      const visitorData = innertube.session.context.client.visitorData || ''

      // BotGuard Initialization
      const dom = new JSDOM('<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>', {
         url: 'https://www.youtube.com/',
         referrer: 'https://www.youtube.com/',
         userAgent: USER_AGENT,
      })

      Object.assign(globalThis, {
         window: dom.window,
         document: dom.window.document,
         location: dom.window.location,
         origin: dom.window.origin,
      })

      if (!Reflect.has(globalThis, 'navigator')) {
         Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator })
      }

      const challengeResponse = await innertube.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND')
      if (!challengeResponse.bg_challenge) throw new Error('Could not get challenge')

      const interpreterUrl =
         challengeResponse.bg_challenge.interpreter_url.private_do_not_access_or_else_trusted_resource_url_wrapped_value
      const bgScriptResponse = await fetch(`https:${interpreterUrl}`)
      const interpreterJavascript = await bgScriptResponse.text()

      if (interpreterJavascript) {
         new Function(interpreterJavascript)()
      } else throw new Error('Could not load VM')

      const botguard = await BG.BotGuardClient.create({
         program: challengeResponse.bg_challenge.program,
         globalName: challengeResponse.bg_challenge.global_name,
         globalObj: globalThis,
      })
      // #endregion

      // #region WebPO Token Generation
      const webPoSignalOutput: WebPoSignalOutput = []
      const botguardResponse = await botguard.snapshot({ webPoSignalOutput })
      const requestKey = 'O43z0dpjhgX20SCx4KAo'

      const integrityTokenResponse = await fetch(buildURL('GenerateIT', true), {
         method: 'POST',
         headers: {
            'content-type': 'application/json+protobuf',
            'x-goog-api-key': GOOG_API_KEY,
            'x-user-agent': 'grpc-web-javascript/0.1',
            'user-agent': USER_AGENT,
         },
         body: JSON.stringify([requestKey, botguardResponse]),
      })

      const response = (await integrityTokenResponse.json()) as unknown[]
      if (typeof response[0] !== 'string') throw new Error('Could not get integrity token')

      const integrityTokenBasedMinter = await BG.WebPoMinter.create({ integrityToken: response[0] }, webPoSignalOutput)

      const contentPoToken = await integrityTokenBasedMinter.mintAsWebsafeString(videoId)
      const sessionPoToken = await integrityTokenBasedMinter.mintAsWebsafeString(visitorData)
      return { contentPoToken, sessionPoToken }
   }),
})
