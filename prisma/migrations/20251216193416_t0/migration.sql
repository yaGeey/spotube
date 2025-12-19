-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_YoutubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "published_at" DATETIME NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "statistics" JSONB NOT NULL,
    "full_response" JSONB NOT NULL,
    "spotify_id" TEXT,
    "lastfm_id" INTEGER,
    CONSTRAINT "YoutubeVideo_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "SpotifyTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YoutubeVideo_lastfm_id_fkey" FOREIGN KEY ("lastfm_id") REFERENCES "LastFM" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_YoutubeVideo" ("artist", "duration_ms", "full_response", "id", "lastfm_id", "published_at", "spotify_id", "statistics", "thumbnail_url", "title", "views") SELECT "artist", "duration_ms", "full_response", "id", "lastfm_id", "published_at", "spotify_id", "statistics", "thumbnail_url", "title", "views" FROM "YoutubeVideo";
DROP TABLE "YoutubeVideo";
ALTER TABLE "new_YoutubeVideo" RENAME TO "YoutubeVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
