-- CreateTable
CREATE TABLE "Genius" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lyrics" TEXT NOT NULL,
    "full_response" JSONB NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_YoutubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "published_at" DATETIME NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "spotify_id" TEXT,
    "lastfm_id" INTEGER,
    "geniusId" INTEGER,
    CONSTRAINT "YoutubeVideo_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "SpotifyTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YoutubeVideo_lastfm_id_fkey" FOREIGN KEY ("lastfm_id") REFERENCES "LastFM" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YoutubeVideo_geniusId_fkey" FOREIGN KEY ("geniusId") REFERENCES "Genius" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_YoutubeVideo" ("author", "author_id", "duration_ms", "id", "lastfm_id", "published_at", "spotify_id", "thumbnail_url", "title", "updated_at", "views") SELECT "author", "author_id", "duration_ms", "id", "lastfm_id", "published_at", "spotify_id", "thumbnail_url", "title", "updated_at", "views" FROM "YoutubeVideo";
DROP TABLE "YoutubeVideo";
ALTER TABLE "new_YoutubeVideo" RENAME TO "YoutubeVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
