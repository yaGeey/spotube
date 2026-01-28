import { Innertube, Platform, Types, UniversalCache, Utils, YT, YTNodes } from 'youtubei.js/web'
import { fetchFunction } from './helpers'
import { USER_AGENT } from 'bgutils-js'

Platform.shim.eval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
   const properties = []
   if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`)
   if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`)
   const code = `${data.output}\nreturn { ${properties.join(', ')} }`
   return new Function(code)()
}

export default class InnertubeClient {
   private static instance: Innertube | null = null
   private static initPromise: Promise<Innertube> | null = null
   private static visitorData: string | null = null
   private constructor() {}

   public static async getInstance(): Promise<Innertube> {
      if (this.instance) return this.instance
      if (this.initPromise) return this.initPromise
      this.initPromise = this.createInstance()
      return this.initPromise
   }

   private static async createInstance(): Promise<Innertube> {
      try {
         const newInstance = await Innertube.create({
            cache: new UniversalCache(false),
            // enable_session_cache: false,
            user_agent: USER_AGENT,
            fetch: fetchFunction,
         })
         this.visitorData = newInstance.session.context.client.visitorData || null
         console.log('[InnertubeClient] Initialized successfully')

         this.instance = newInstance
         this.initPromise = null

         return newInstance
      } catch (error) {
         this.initPromise = null
         console.error('[InnertubeClient] Initialization failed', error)
         throw error
      }
   }

   public static reset(): void {
      this.instance = null
      this.initPromise = null
   }

   public static async getVideoStreamInfo(
      videoId: string,
      config?: { startTime?: number; playlistId?: string },
   ): Promise<YT.VideoInfo> {
      const instance = await this.getInstance()
      const cpn = Utils.generateRandomString(16)

      const playerResponse = await instance.actions.execute('/player', {
         videoId,
         contentCheckOk: true,
         racyCheckOk: true,
         startTimeSeconds: config?.startTime,
         playlistId: config?.playlistId,
         playbackContext: {
            contentPlaybackContext: {
               signatureTimestamp: instance.session.player?.signature_timestamp,
            },
         },
      })

      return new YT.VideoInfo([playerResponse], instance.actions, cpn)
   }

   public static async getReloadedVideoStreamInfo(videoId: string, reloadContext: any): Promise<YT.VideoInfo> {
      const instance = await this.getInstance()
      const cpn = Utils.generateRandomString(16)

      const playerResponse = await instance.actions.execute('/player', {
         videoId,
         contentCheckOk: true,
         racyCheckOk: true,
         playbackContext: {
            contentPlaybackContext: {
               signatureTimestamp: instance.session.player?.signature_timestamp,
            },
            reloadPlaybackContext: reloadContext,
            adPlaybackContext: {
               pyv: true, // SABR хоче це поле, щоб прикидатися офіційним клієнтом
            },
         },
      })

      return new YT.VideoInfo([playerResponse], instance.actions, cpn)
   }

   public static async getVideoInfo(videoId: string) {
      const instance = await this.getInstance()
      const nextResponse = await instance.actions.execute('/next', {
         videoId,
         parse: true,
      })

      const primaryInfo = nextResponse.contents_memo?.getType(YTNodes.VideoPrimaryInfo).first()
      const secondaryInfo = nextResponse.contents_memo?.getType(YTNodes.VideoSecondaryInfo).first()
      // related videos
      const secondaryResults = nextResponse.contents?.item().as(YTNodes.TwoColumnWatchNextResults).secondary_results

      // if (videoPrimaryInfo?.title) document.title = videoPrimaryInfo.title.toString()

      console.log('Video Primary Info:', primaryInfo)
      console.log('Video Secondary Info:', secondaryInfo)
      console.log('Secondary Results:', secondaryResults)
      const details = {
         id: videoId,
         title: primaryInfo?.title.toString(),
         channel: {
            id: secondaryInfo?.owner?.author.id,
            name: secondaryInfo?.owner?.author.name,
            avatarUrl: secondaryInfo?.owner?.author.best_thumbnail?.url,
            subscribers: secondaryInfo?.owner?.subscriber_count.toString(),
            isVerified: secondaryInfo?.owner?.author.is_verified || secondaryInfo?.owner?.author.is_verified_artist,
            url: secondaryInfo?.owner?.author.url,
         },
         views: primaryInfo?.view_count?.short_view_count.isEmpty()
            ? primaryInfo.view_count.view_count.toString()
            : primaryInfo?.view_count?.short_view_count.toString(),
         publishDate: primaryInfo?.relative_date.isEmpty() ? undefined : primaryInfo?.relative_date.toString(),
         description: secondaryInfo?.description,
      } satisfies VideoDetails

      const relatedVideos = []
      if (secondaryResults) {
         for (const item of secondaryResults) {
            if (!item.is(YTNodes.LockupView)) continue
            if (item.content_type !== 'VIDEO') continue

            const metadata = item.metadata
            const contentImage = item.content_image

            if (!metadata || !contentImage?.is(YTNodes.ThumbnailView)) continue

            const durationOverlay = contentImage.overlays
               ?.find(
                  (overlay) =>
                     overlay.is(YTNodes.ThumbnailOverlayBadgeView) &&
                     overlay.position === 'THUMBNAIL_OVERLAY_BADGE_POSITION_BOTTOM_END',
               )
               ?.as(YTNodes.ThumbnailOverlayBadgeView)

            const obj = {
               id: item.content_id,
               title: metadata.title.toString(),
               channel: {
                  avatarUrl: metadata.image?.as(YTNodes.DecoratedAvatarView)?.avatar?.image[0].url,
               },
               thumbnailUrl: contentImage.image[0].url,
               metadata:
                  metadata.metadata?.metadata_rows.map((row) => {
                     return row.metadata_parts?.map((item) => item.text?.toString()).join(metadata.metadata?.delimiter) || ''
                  }) || [],
               duration: durationOverlay?.badges[0]?.text,
            } satisfies RelatedVideo
            relatedVideos.push(obj)
         }
      }

      return { details, relatedVideos } as { relatedVideos: RelatedVideo[]; details: VideoDetails }
   }
}
type DefaultDetails = {
   id: string
   title?: string
}
export type VideoDetails = {
   channel: {
      id?: string
      name?: string
      avatarUrl?: string
      subscribers?: string
      isVerified?: boolean
      url?: string
   }
   views?: string
   publishDate?: string
   description?: YTNodes.VideoSecondaryInfo['description']
} & DefaultDetails

export type RelatedVideo = {
   channel: {
      avatarUrl?: string
   }
   thumbnailUrl: string
   metadata: string[]
   duration?: string
} & DefaultDetails
