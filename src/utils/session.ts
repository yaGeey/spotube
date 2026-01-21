import { SabrFormat } from 'googlevideo/shared-types'
import { z } from 'zod'

const CachedVideoDataSchema = z.object({
   manifestUri: z.string().min(1, { message: 'Manifest URI is empty' }),
   streamingUrl: z.url({ message: 'Invalid Streaming URL' }),
   formats: z.custom<SabrFormat[]>((val) => Array.isArray(val) && val.length > 0, {
      message: 'Formats must be a non-empty array',
   }),
   ustreamerConfig: z.string().optional(),
   expire: z.number().int().positive({ message: 'Expire must be a valid timestamp' }),
})
export type CachedVideoData = z.infer<typeof CachedVideoDataSchema>

export function setPlaybackDataToSession(videoId: string, videoData: Partial<CachedVideoData>) {
   const result = CachedVideoDataSchema.safeParse(videoData)
   if (!result.success) {
      console.warn(`[Cache] Validation failed for video ${videoId}:`, z.treeifyError(result.error))
      return
   }

   // account for storage quota exceeded
   try {
      sessionStorage.setItem(`sabr_${videoId}`, JSON.stringify(result.data))
   } catch (e) {
      console.error('[Cache] Storage Quota Exceeded', e)
      sessionStorage.clear()
   }
}

// TODO zod validation can be used here as well if needed
export function getPlaybackDataFromSession(videoId: string) {
   const item = sessionStorage.getItem(`sabr_${videoId}`)
   if (!item) return null

   const data = JSON.parse(item) as CachedVideoData
   const now = Math.floor(Date.now() / 1000) // to unix timestamp
   // expire in less than 15 minutes
   if (data.expire < now + 900) {
      sessionStorage.removeItem(`sabr_${videoId}`)
      return null
   }
   return data
}
