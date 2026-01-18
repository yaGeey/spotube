// declare global {
//    namespace Prisma {
//       export type GeniusSongApiResponse = GeniusSong
//       export type GeniusReferentsApiResponse = GeniusReferents
//       export type GeniusSearchApiResponse = GeniusSearch
//       export type GeniusArtistApiResponse = GeniusArtist
//    }
// }

/**
SONG RES:
language - lyrics language (translate with ai for other user languages)
title

хоча вже є ця дата в spotify album, але для ютуба - можн, так само як і album object
"release_date": "2013-12-30",
"release_date_for_display": "December 30, 2013",
"release_date_with_abbreviated_month_for_display": "Dec. 30, 2013"

"song_art_primary_color": "#c18a4d",
"song_art_secondary_color": "#8a552f",
"song_art_text_color": "#fff",

media - масив з юрлами на відео/аудіо (youtube, soundcloud, spotify)

song: description_annotation.annotations - аннотації до опису пісні (біографія, цікаві факти і тд)
в артистах теж пошукать треба

// SONGS OBJECTS
song_relationships - кавер бай, каверф оф, ремікси, переклади, лайв тощо
translation_songs: переклади пісень 

// ARTIST OBJECTS
custom_performances: інфа про всіх хто причасний до треку/відео. по їх api_path можна отримати до чого ще вони причасні (можна прост віддати юрл геніуса юзеру впринципі)
artist, primary_artists, featured_artists, producer_artists, writer_artists - all have same structure.
Search this by api_path to get full artist object.


*/

// ---------------------------------------------------------------------------
// ENUMS & UNIONS (Strict Types)
// ---------------------------------------------------------------------------

/** Усі можливі типи зв'язків між піснями */
export type GeniusRelationshipType =
   | 'samples'
   | 'sampled_in'
   | 'interpolates'
   | 'interpolated_by'
   | 'cover_of'
   | 'covered_by'
   | 'remix_of'
   | 'remixed_by'
   | 'live_version_of'
   | 'performed_live_as'
   | 'translation_of'
   | 'translations'

/** Ролі виконавців */
export type GeniusCustomPerformanceLabel =
   | 'Video Director'
   | 'Translator'
   | 'Video Producer'
   | 'Video Editor'
   | 'Graphic Design'
   | 'Illustration'
   | 'Video Animator'
   | 'Arranger'

/** Теги, що використовуються в DOM структурі опису */
export type GeniusDomTag = 'root' | 'p' | 'strong' | 'a' | 'em' | 'blockquote'

export type GeniusIqActionType = 'edit_metadata' | 'answer_question' | 'accept' | 'reject' | 'delete'

export type GeniusMediaType = 'video' | 'audio'
export type GeniusMediaProvider = 'youtube' | 'soundcloud' | 'spotify'
export type GeniusLyricsState = 'complete' | 'incomplete'
export type GeniusAnnotationState = 'pending' | 'verified' | 'accepted'

// ---------------------------------------------------------------------------
// DOM & TEXT STRUCTURES
// ---------------------------------------------------------------------------

export interface GeniusDomNode {
   tag: GeniusDomTag
   children?: (string | GeniusDomNode)[]
   attributes?: {
      href?: string
      rel?: string
   }
   data?: {
      api_path: string
   }
}

export interface GeniusDescription {
   dom: GeniusDomNode
}

// ---------------------------------------------------------------------------
// IMAGES & STATS
// ---------------------------------------------------------------------------

export interface GeniusImageDimensions {
   url: string
   bounding_box: {
      width: number
      height: number
   }
}

export interface GeniusAvatar {
   tiny: GeniusImageDimensions
   thumb: GeniusImageDimensions
   small: GeniusImageDimensions
   medium: GeniusImageDimensions
}

export interface GeniusStats {
   accepted_annotations?: number
   contributors?: number
   iq_earners?: number
   transcribers?: number
   unreviewed_annotations?: number
   verified_annotations?: number
   hot: boolean
   pageviews?: number
}

export interface GeniusReleaseDateComponents {
   year: number
   month: number
   day: number
}

// ---------------------------------------------------------------------------
// USER & ARTIST METADATA
// ---------------------------------------------------------------------------

export interface GeniusIqActionDetail {
   multiplier: number
   base: number
   applicable: boolean
}

export interface GeniusInteractions {
   pyong?: boolean
   following?: boolean
   cosign?: boolean
   vote?: null | boolean
}

export interface GeniusCurrentUserMetadata {
   interactions: GeniusInteractions
   relationships?: {
      pinned_role: null | string
   }
   // Використовуємо Partial Record, оскільки не всі ключі завжди присутні
   iq_by_action?: Partial<Record<GeniusIqActionType, { primary: GeniusIqActionDetail }>>
}

export interface GeniusArtist {
   api_path: string
   header_image_url: string
   id: number
   image_url: string
   is_meme_verified: boolean
   is_verified: boolean
   name: string
   url: string
   iq?: number
   login?: string // Присутнє, якщо це користувач
   avatar?: GeniusAvatar // Присутнє, якщо це користувач
   human_readable_role_for_display?: null | string
   role_for_display?: null | string
   current_user_metadata?: GeniusCurrentUserMetadata
}

// ---------------------------------------------------------------------------
// ALBUM & PERFORMANCE
// ---------------------------------------------------------------------------

export interface GeniusAlbum {
   api_path: string
   cover_art_url: string
   full_title: string
   id: number
   name: string
   primary_artist_names?: string
   release_date_for_display: string
   url: string
   artist: GeniusArtist
   primary_artists: GeniusArtist[]
}

export interface GeniusCustomPerformance {
   label: GeniusCustomPerformanceLabel
   artists: GeniusArtist[]
}

export interface GeniusMedia {
   provider: GeniusMediaProvider
   start: number
   type: GeniusMediaType
   url: string
}

// ---------------------------------------------------------------------------
// ANNOTATIONS
// ---------------------------------------------------------------------------

export interface GeniusAnnotationAuthor {
   attribution: number
   pinned_role: null | string
   user: GeniusArtist
}

export interface GeniusAnnotationBody {
   dom: GeniusDomNode
}

export interface GeniusAnnotation {
   api_path: string
   body: GeniusAnnotationBody
   comment_count: number
   community: boolean
   custom_preview: null | string
   has_voters: boolean
   id: number
   pinned: boolean
   share_url: string
   source: null | string
   state: GeniusAnnotationState
   url: string
   verified: boolean
   votes_total: number
   current_user_metadata: GeniusCurrentUserMetadata
   authors: GeniusAnnotationAuthor[]
   cosigned_by: unknown[]
   rejection_comment: null | string
   verified_by: null | GeniusArtist
}

export interface GeniusDescriptionAnnotation {
   _type: string // e.g., "referent"
   annotator_id: number
   annotator_login: string
   api_path: string
   classification: string
   fragment: string
   id: number
   is_description: boolean
   path: string
   range: {
      content: string
   }
   song_id: number
   url: string
   verified_annotator_ids: number[]
   annotatable: {
      api_path: string
      client_timestamps: {
         updated_by_human_at: number
         lyrics_updated_at: number
      }
      context: string
      id: number
      image_url: string
      link_title: string
      title: string
      type: 'Song'
      url: string
   }
   annotations: GeniusAnnotation[]
}

// ---------------------------------------------------------------------------
// SONG RELATIONSHIPS
// ---------------------------------------------------------------------------

/** Скорочена версія об'єкта Song, яка використовується всередині масивів relationships */
export interface GeniusRelatedSong {
   annotation_count: number
   api_path: string
   artist_names: string
   full_title: string
   header_image_thumbnail_url: string
   header_image_url: string
   id: number
   language?: string
   lyrics_owner_id: number
   lyrics_state: GeniusLyricsState
   path: string
   primary_artist_names: string
   pyongs_count: null | number
   relationships_index_url?: string
   release_date_components: GeniusReleaseDateComponents | null
   release_date_for_display: string | null
   release_date_with_abbreviated_month_for_display: string | null
   song_art_image_thumbnail_url: string
   song_art_image_url: string
   stats: GeniusStats
   title: string
   title_with_featured: string
   url: string
   featured_artists: GeniusArtist[]
   primary_artist: GeniusArtist
   primary_artists: GeniusArtist[]
}

export interface GeniusSongRelationship {
   relationship_type: GeniusRelationshipType
   type: GeniusRelationshipType
   url: string | null
   songs: GeniusRelatedSong[]
}

export interface GeniusTranslationSongLink {
   api_path: string
   id: number
   language: string
   lyrics_state: GeniusLyricsState
   path: string
   title: string
   url: string
}

// ---------------------------------------------------------------------------
// MAIN SONG OBJECT
// ---------------------------------------------------------------------------

export interface GeniusSong {
   annotation_count: number
   api_path: string
   apple_music_id: string
   apple_music_player_url: string
   artist_names: string
   description: GeniusDescription
   embed_content: string
   full_title: string
   header_image_thumbnail_url: string
   header_image_url: string
   id: number
   language: string
   lyrics_owner_id: number
   lyrics_state: GeniusLyricsState
   path: string
   primary_artist_names: string
   pyongs_count: null | number
   recording_location: null | string
   relationships_index_url: string
   release_date: string
   release_date_for_display: string
   release_date_with_abbreviated_month_for_display: string
   song_art_image_thumbnail_url: string
   song_art_image_url: string
   stats: GeniusStats
   title: string
   title_with_featured: string
   url: string
   current_user_metadata: GeniusCurrentUserMetadata
   song_art_primary_color: string
   song_art_secondary_color: string
   song_art_text_color: string
   album: GeniusAlbum
   custom_performances: GeniusCustomPerformance[]
   description_annotation: GeniusDescriptionAnnotation
   featured_artists: GeniusArtist[]
   lyrics_marked_complete_by: null | GeniusArtist
   lyrics_marked_staff_approved_by: null | GeniusArtist
   media: GeniusMedia[]
   primary_artist: GeniusArtist
   primary_artists: GeniusArtist[]
   producer_artists: GeniusArtist[]
   song_relationships: GeniusSongRelationship[]
   translation_songs: GeniusTranslationSongLink[]
   verified_annotations_by: unknown[] // Порожній масив у прикладі, тип невідомий
   verified_contributors: unknown[]
   verified_lyrics_by: unknown[]
   writer_artists: GeniusArtist[]
}

// ---------------------------------------------------------------------------
// ROOT API RESPONSE
// ---------------------------------------------------------------------------

export interface GeniusSongApiResponse {
   meta: {
      status: number
   }
   response: {
      song: GeniusSong
   }
}

// ---------------------------------------------------------------------------
// SEARCH SPECIFIC TYPES
// ---------------------------------------------------------------------------

export type GeniusSearchIndexType = 'song' | 'artist' | 'lyric' | 'video' // Розширюваний список, базується на "song" з JSON
export type GeniusSearchHitType = 'song' | 'featured_artist'

// Це полегшена версія пісні, яка приходить у результатах пошуку.
// Вона схожа на GeniusRelatedSong, але має деякі відмінності у stats та highlights.
export interface GeniusSearchResult {
   annotation_count: number
   api_path: string
   artist_names: string
   full_title: string
   header_image_thumbnail_url: string
   header_image_url: string
   id: number
   lyrics_owner_id: number
   lyrics_state: GeniusLyricsState
   path: string
   primary_artist_names: string
   pyongs_count: number | null
   relationships_index_url: string
   release_date_components: GeniusReleaseDateComponents | null
   release_date_for_display: string | null
   release_date_with_abbreviated_month_for_display: string | null
   song_art_image_thumbnail_url: string
   song_art_image_url: string
   stats: GeniusStats // Використовуємо спільний інтерфейс Stats (hot, pageviews, unreviewed_annotations)
   title: string
   title_with_featured: string
   url: string
   featured_artists: GeniusArtist[]
   primary_artist: GeniusArtist
   primary_artists: GeniusArtist[]
}

export interface GeniusSearchHit {
   highlights: unknown[] // У прикладі порожній масив, структура невідома
   index: GeniusSearchIndexType
   type: GeniusSearchHitType
   result: GeniusSearchResult
}

// ---------------------------------------------------------------------------
// SEARCH ROOT RESPONSE
// ---------------------------------------------------------------------------

export interface GeniusSearchApiResponse {
   meta: {
      status: number
   }
   response: {
      hits: GeniusSearchHit[]
   }
}

export type GeniusReferents = {
   meta: {
      status: number
   }
   response: {
      referents: Array<{
         _type: string
         annotator_id: number
         annotator_login: string
         api_path: string
         classification: string
         fragment: string
         id: number
         is_description: boolean
         path: string
         range: {
            content: string
         }
         song_id: number
         url: string
         verified_annotator_ids: number[]
         annotatable: {
            api_path: string
            client_timestamps: {
               updated_by_human_at: number
               lyrics_updated_at: number
            }
            context: string
            id: number
            image_url: string
            link_title: string
            title: string
            type: string
            url: string
         }
         annotations: Array<{
            api_path: string
            comment_count: number
            community: boolean
            custom_preview: null | any
            has_voters: boolean
            id: number
            pinned: boolean
            share_url: string
            source: null | any
            state: string
            url: string
            verified: boolean
            votes_total: number
            current_user_metadata: {
               permissions: string[]
               excluded_permissions: string[]
               interactions: {
                  cosign: boolean
                  pyong: boolean
                  vote: null | string
               }
               iq_by_action: {
                  [actionName: string]: {
                     primary: {
                        multiplier: number
                        base: number
                        applicable: boolean
                     }
                  }
               }
            }
            authors: Array<{
               attribution: number
               pinned_role: null | any
               user: {
                  api_path: string
                  avatar: {
                     tiny: {
                        url: string
                        bounding_box: { width: number; height: number }
                     }
                     thumb: {
                        url: string
                        bounding_box: { width: number; height: number }
                     }
                     small: {
                        url: string
                        bounding_box: { width: number; height: number }
                     }
                     medium: {
                        url: string
                        bounding_box: { width: number; height: number }
                     }
                  }
                  header_image_url: string
                  human_readable_role_for_display: string | null
                  id: number
                  iq: number
                  login: string
                  name: string
                  role_for_display: string | null
                  url: string
                  current_user_metadata: {
                     permissions: string[]
                     excluded_permissions: string[]
                     interactions: {
                        following: boolean
                     }
                  }
               }
            }>
            cosigned_by: any[]
            rejection_comment: null | string
            verified_by: null | any
         }>
      }>
   }
}

// ---------------------------------------------------------------------------
// UPDATED UNIONS (Add these to the existing GeniusPermission type)
// ---------------------------------------------------------------------------

export type GeniusAnnotatableType = 'Song' | 'Artist' | 'User'

// ---------------------------------------------------------------------------
// SOCIAL & METADATA STRUCTURES
// ---------------------------------------------------------------------------

export interface GeniusSocialLinks {
   twitter?: string
   facebook?: string
   instagram?: string
   youtube?: string // Часто зустрічається, хоча немає в цьому JSON
}

// ---------------------------------------------------------------------------
// ANNOTATION SPECIFIC UPDATES
// ---------------------------------------------------------------------------

// Оновлюємо Annotatable, щоб підтримувати контекст Artist
export interface GeniusAnnotatable {
   api_path: string
   client_timestamps?: {
      updated_by_human_at: number
      lyrics_updated_at: number
   }
   context: string | null // Nullable for artists
   id: number
   image_url: string
   link_title: string
   title: string
   type: GeniusAnnotatableType
   url: string
}

// Перевизначаємо DescriptionAnnotation, щоб використовувати оновлений Annotatable
export interface GeniusDescriptionAnnotation {
   _type: string
   annotator_id: number
   annotator_login: string
   api_path: string
   classification: string
   fragment: string
   id: number
   is_description: boolean
   path: string
   range: {
      content: string
   }
   song_id: number
   url: string
   verified_annotator_ids: number[]
   annotations: GeniusAnnotation[] // Reusing existing Annotation
}

// ---------------------------------------------------------------------------
// ARTIST FULL OBJECT
// ---------------------------------------------------------------------------

// Використовуємо Omit, щоб перезаписати current_user_metadata з розширеними правами,
// або просто розширюємо, якщо базовий тип GeniusArtist дозволяє опціональні поля.
// Тут я створюю повний інтерфейс, який наслідує базовий.

export interface GeniusArtistFull extends GeniusArtist {
   alternate_names: string[]
   description: GeniusDescription
   facebook_name: string | null
   followers_count: number
   instagram_name: string | null
   social_links: GeniusSocialLinks
   translation_artist: boolean
   twitter_name: string | null
   description_annotation: GeniusDescriptionAnnotation

   // User field is nullable based on the JSON
   user: null | GeniusArtist
}

// ---------------------------------------------------------------------------
// ROOT RESPONSE
// ---------------------------------------------------------------------------

export interface GeniusArtistApiResponse {
   meta: {
      status: number
   }
   response: {
      artist: GeniusArtistFull
   }
}

// ---------------------------------------------------------------------------
// REFERENT SPECIFIC TYPES
// ---------------------------------------------------------------------------

export type GeniusReferentType = 'referent'
export type GeniusReferentClassification = 'unreviewed' | 'accepted' | 'verified' | 'needs_explication'

export interface GeniusReferentRange {
   content: string
}

export interface GeniusReferent {
   _type: GeniusReferentType
   annotator_id: number
   annotator_login: string
   api_path: string
   classification: GeniusReferentClassification
   fragment: string
   id: number
   is_description: boolean
   path: string
   range: GeniusReferentRange
   song_id: number | null // Nullable, as seen in description annotations or non-song contexts
   url: string
   verified_annotator_ids: number[]

   // Reusing the Annotatable interface defined in the Artist step
   annotatable: GeniusAnnotatable

   // Reusing the Annotation interface defined in the Song step
   annotations: GeniusAnnotation[]
}

// ---------------------------------------------------------------------------
// ROOT RESPONSE
// ---------------------------------------------------------------------------

export interface GeniusReferentsApiResponse {
   meta: {
      status: number
   }
   response: {
      referents: GeniusReferent[]
   }
}
