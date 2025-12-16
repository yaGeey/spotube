import { logPrettyError } from '../axios'
import { db, sql } from '../db'
import { DBInput } from '@/src/types/types'

let insertLastfmQuery: any
export const dbInsertLastfmInfo = (data: Omit<DBInput['lastfm'], 'id'>): number => {
   const result = insertLastfmQuery.run(JSON.stringify(data.track), JSON.stringify(data.album), JSON.stringify(data.artist))
   console.log(result)
   return result.lastInsertRowid as number
}

try {
   db.exec(sql`
      CREATE TABLE IF NOT EXISTS lastfm_info (
         id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
         track TEXT,
         album TEXT,
         artist TEXT
      )
   `)

   insertLastfmQuery = db.prepare(sql`
      INSERT OR IGNORE INTO lastfm_info (track, album, artist) 
      VALUES (?, ?, ?)   
   `)
} catch (err) {
   logPrettyError(err)
}
