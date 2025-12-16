import { logPrettyError } from '../axios'
import { db, sql } from '../db'
import { DBInput } from '@/src/types/types'

let insertSpotifyQuery: any
export let getSpotifyTracksByPlaylistIDQuery: any
export let createSpotifyPlaylistByIDQuery: any
let addSpotifyTrackToPlaylistQuery: any

export const dbInsertSpotifyTrack = (playlistId: string, tracks: DBInput['spotify']) => {
   createSpotifyPlaylistByIDQuery.run(playlistId)
   insertSpotifyQuery.run(tracks.id, tracks.title, tracks.artist, JSON.stringify(tracks.full_response))
   addSpotifyTrackToPlaylistQuery.run(playlistId, tracks.id)
}

try {
   db.exec(sql`
      CREATE TABLE IF NOT EXISTS spotify_playlists (
         id TEXT PRIMARY KEY NOT NULL,
         title TEXT,
         owner TEXT,
         full_response TEXT
      );

      CREATE TABLE IF NOT EXISTS spotify_playlist_items (
         playlist_id TEXT NOT NULL,
         track_id TEXT NOT NULL,
         PRIMARY KEY (playlist_id, track_id),
         FOREIGN KEY (playlist_id) REFERENCES spotify_playlists (id) ON DELETE CASCADE,
         FOREIGN KEY (track_id) REFERENCES spotify_tracks (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS spotify_tracks (
         id TEXT PRIMARY KEY NOT NULL,
         title TEXT NOT NULL,
         artist TEXT NOT NULL,
         full_response TEXT NOT NULL
      );
   `)

   insertSpotifyQuery = db.prepare(sql`
      INSERT OR IGNORE INTO spotify_tracks (id, title, artist, full_response) 
      VALUES (?, ?, ?, ?)   
   `)
   getSpotifyTracksByPlaylistIDQuery = db.prepare(sql`
      SELECT spotify_tracks.* FROM spotify_tracks
      JOIN spotify_playlist_items items ON spotify_tracks.id = items.track_id
      WHERE items.playlist_id = ?
   `)
   createSpotifyPlaylistByIDQuery = db.prepare(sql`
      INSERT OR IGNORE INTO spotify_playlists (id) 
      VALUES (?)   
   `)
   addSpotifyTrackToPlaylistQuery = db.prepare(sql`
      INSERT OR IGNORE INTO spotify_playlist_items (playlist_id, track_id) 
      VALUES (?, ?)   
   `)
} catch (err) {
   logPrettyError(err)
}
