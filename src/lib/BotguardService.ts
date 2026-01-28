import { fetchFunction } from './helpers'
import type { WebPoSignalOutput } from 'bgutils-js'
import { BG, buildURL, GOOG_API_KEY } from 'bgutils-js'
import InnertubeClient from './InnertubeClient'
import { IBotguardChallenge } from 'youtubei.js'

export class BotguardService {
   private readonly waaRequestKey = 'O43z0dpjhgX20SCx4KAo'

   public botguardClient?: BG.BotGuardClient
   public initializationPromise?: Promise<BG.BotGuardClient | void>
   public integrityTokenBasedMinter?: BG.WebPoMinter
   public bgChallenge?: IBotguardChallenge

   async init() {
      if (this.initializationPromise) {
         return await this.initializationPromise
      }

      return this.setup()
   }

   private async setup() {
      if (this.initializationPromise) return await this.initializationPromise

      this.initializationPromise = this._initBotguard()

      try {
         this.botguardClient = (await this.initializationPromise) || undefined
         return this.botguardClient
      } finally {
         this.initializationPromise = undefined
      }
   }

   private async _initBotguard() {
      const innertube = await InnertubeClient.getInstance()
      const challengeResponse = await innertube.getAttestationChallenge('ENGAGEMENT_TYPE_UNBOUND')

      if (!challengeResponse?.bg_challenge)
         return console.error('[BotguardService] Could not get attestation challenge via Innertube')
      this.bgChallenge = challengeResponse.bg_challenge

      const interpreterUrlPath = this.bgChallenge.interpreter_url.private_do_not_access_or_else_trusted_resource_url_wrapped_value
      if (!interpreterUrlPath) return console.error('[BotguardService] Interpreter URL is empty')

      // Іноді URL приходить без протоколу, додаємо https якщо треба (як в прикладі LuanRT)
      const fullInterpreterUrl = interpreterUrlPath.startsWith('http') ? interpreterUrlPath : `https:${interpreterUrlPath}`

      // const bgScriptResponse = await fetchFunction(fullInterpreterUrl, {
      //    method: 'GET',
      // }).then(res => res.text()).catch(err => {
      //    console.error('[BotguardService] Could not fetch interpreter javascript:', err)
      //    return null
      // })
      const bgScriptResponse = await fetch(fullInterpreterUrl, {
         method: 'GET',
      }).catch((err) => {
         console.error('[BotguardService] Could not fetch interpreter javascript:', err)
         return null
      })
      if (!bgScriptResponse) return console.error('[BotguardService] Could not fetch interpreter javascript')
      const interpreterJavascript = await bgScriptResponse.text()

      // we could use just new Function(interpreterJavascript)()
      // but to be safe we inject the script into the document
      if (!document.getElementById(this.bgChallenge.interpreter_hash)) {
         const script = document.createElement('script')
         script.type = 'text/javascript'
         script.id = this.bgChallenge.interpreter_hash
         script.textContent = interpreterJavascript
         document.head.appendChild(script)
      }

      this.botguardClient = await BG.BotGuardClient.create({
         globalObj: globalThis,
         globalName: this.bgChallenge.global_name,
         program: this.bgChallenge.program,
      })

      if (this.bgChallenge) {
         const webPoSignalOutput: WebPoSignalOutput = []
         const botguardResponse = await this.botguardClient.snapshot({ webPoSignalOutput })

         const integrityTokenResponse = await fetchFunction(buildURL('GenerateIT', true), {
            method: 'POST',
            headers: {
               'content-type': 'application/json+protobuf',
               'x-goog-api-key': GOOG_API_KEY,
               'x-user-agent': 'grpc-web-javascript/0.1',
            },
            body: JSON.stringify([this.waaRequestKey, botguardResponse]),
         })

         const integrityTokenResponseData = await integrityTokenResponse.json()
         const integrityToken = integrityTokenResponseData[0] as string | undefined

         if (!integrityToken) {
            console.error(
               '[BotguardService]',
               'Could not get integrity token. Interpreter Hash:',
               this.bgChallenge.interpreter_hash,
            )
            return
         }

         this.integrityTokenBasedMinter = await BG.WebPoMinter.create({ integrityToken }, webPoSignalOutput)
      }

      return this.botguardClient
   }

   public mintColdStartToken(contentBinding: string) {
      return BG.PoToken.generateColdStartToken(contentBinding)
   }

   public isInitialized() {
      return !!this.botguardClient && !!this.integrityTokenBasedMinter
   }

   public dispose() {
      if (this.botguardClient && this.bgChallenge) {
         this.botguardClient.shutdown()
         this.botguardClient = undefined
         this.integrityTokenBasedMinter = undefined

         const script = document.getElementById(this.bgChallenge.interpreter_hash)
         this.bgChallenge = undefined
         if (script) {
            script.remove()
         }
      }
   }

   public async reinit() {
      if (this.initializationPromise) return this.initializationPromise
      this.dispose()
      return this.setup()
   }
}

export const botguardService = new BotguardService()
