import { logPrettyError } from '../axios'
import { db, sql } from '../db'
import { DBInput } from '@/src/types/types'

let insertYtVideoQuery: any
export let getYtVideoBySpotifyIDQuery: any
export let getYtPlaylistVideosByIDQuery: any
let createYtPlaylistQuery: any
let addYtItemToPlaylistQuery: any

export const dbInsertYtVideo = (data: DBInput['youtube'], playlistId?: string) => {
   if (playlistId) createYtPlaylistQuery.run(playlistId)
   // prettier-ignore
   insertYtVideoQuery.run(data.id, data.spotify_id, data.lastfm_id, data.title, data.artist, data.duration_ms, JSON.stringify(data.full_response))
   if (playlistId) addYtItemToPlaylistQuery.run(playlistId, data.id)
}
try {
   db.exec(sql`
      CREATE TABLE IF NOT EXISTS youtube_playlists (
         id TEXT PRIMARY KEY NOT NULL,
         title TEXT,
         owner TEXT,
         full_response TEXT
      );

      CREATE TABLE IF NOT EXISTS youtube_playlist_items (
         playlist_id TEXT NOT NULL,
         video_id TEXT NOT NULL,
         PRIMARY KEY (playlist_id, video_id),
         FOREIGN KEY (playlist_id) REFERENCES youtube_playlists (id) ON DELETE CASCADE,
         FOREIGN KEY (video_id) REFERENCES youtube_videos (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS youtube_videos (
         id TEXT PRIMARY KEY NOT NULL,
         spotify_id TEXT,
         lastfm_id TEXT, 
         title TEXT NOT NULL,
         artist TEXT NOT NULL,
         duration_ms INTEGER NOT NULL,
         full_response TEXT NOT NULL,
         FOREIGN KEY (spotify_id) REFERENCES spotify_tracks (id) ON DELETE SET NULL,
         FOREIGN KEY (lastfm_id) REFERENCES lastfm_info (id) ON DELETE SET NULL
      );
   `)

   insertYtVideoQuery = db.prepare(sql`
      INSERT OR IGNORE INTO youtube_videos (id, spotify_id, lastfm_id, title, artist, duration_ms, full_response) 
      VALUES (?, ?, ?, ?, ?, ?, ?)   
   `)

   getYtVideoBySpotifyIDQuery = db.prepare(sql`
      SELECT 
         youtube_videos.*,
         lastfm_info.track as lastfm_track,
         lastfm_info.album as lastfm_album,
         lastfm_info.artist as lastfm_artist
      FROM youtube_videos
      LEFT JOIN lastfm_info ON youtube_videos.lastfm_id = lastfm_info.id
      WHERE youtube_videos.spotify_id = ?
   `)

   getYtPlaylistVideosByIDQuery = db.prepare(sql`
      SELECT 
         youtube_videos.*,
         lastfm_info.track as lastfm_track,
         lastfm_info.album as lastfm_album,
         lastfm_info.artist as lastfm_artist
      FROM youtube_videos
      JOIN youtube_playlist_items items ON youtube_videos.id = items.video_id
      LEFT JOIN lastfm_info ON youtube_videos.lastfm_id = lastfm_info.id
      WHERE items.playlist_id = ?
   `)

   createYtPlaylistQuery = db.prepare(sql`
      INSERT OR IGNORE INTO youtube_playlists (id) VALUES (?)   
   `)
   addYtItemToPlaylistQuery = db.prepare(sql`
      INSERT OR IGNORE INTO youtube_playlist_items (playlist_id, video_id) 
      VALUES (?, ?)   
   `)
} catch (err) {
   logPrettyError(err)
}
