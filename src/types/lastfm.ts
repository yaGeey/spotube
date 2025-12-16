type Tag = {
   name: string
   url: string
}

export type LastFMTrack = {
   name: string
   mbid: string
   url: string
   duration: string
   artist: {
      name: string
      mbid: string | null
      url: string
   }
   album: {
      artist: string
      title: string
      url: string
      image: { '#text': string; size: string }[]
   }
   toptags: {
      tag: Tag[]
   }
   wiki: {
      published: string
      summary: string
      content: string
   } | null
}

export type LastFMArtist = {
   name: string
   mbid: string
   url: string
   image: { '#text': string; size: string }[]
   similar: {
      artist: LastFMArtist[]
   }
   tags: {
      tag: Tag[]
   }
   bio: {
      published: string
      summary: string
      content: string
   } | null
}

export type LastFMAlbum = {
   name: string
   mbid: string
   url: string
   wiki: {
      published: string
      summary: string
      content: string
   }
   artist: string
   image: { '#text': string; size: string }[]
   tags: {
      tag: Tag[]
   }
}
