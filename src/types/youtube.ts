type YTThumbnail = {
   url: string
   width: number
   height: number
}

export type YTVideoOld = {
   id: string
   snippet: {
      publishedAt: string
      title: string
      description: string
      thumbnails: {
         default?: YTThumbnail
         medium?: YTThumbnail
         high?: YTThumbnail
         standard?: YTThumbnail
         maxres?: YTThumbnail
      }
      playlistId: string
      resourceId: {
         kind: string
         videoId: string
      }
      videoOwherChannelTitle: string
      videoOwnerChannelId: string
   }
}
