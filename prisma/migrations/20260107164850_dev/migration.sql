/*
  Warnings:

  - You are about to drop the column `full_response` on the `YoutubeVideo` table. All the data in the column will be lost.
  - Added the required column `author_id` to the `YoutubeVideo` table without a default value. This is not possible if the table is not empty.

*/
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
    CONSTRAINT "YoutubeVideo_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "SpotifyTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YoutubeVideo_lastfm_id_fkey" FOREIGN KEY ("lastfm_id") REFERENCES "LastFM" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_YoutubeVideo" ("author", "duration_ms", "id", "lastfm_id", "published_at", "spotify_id", "thumbnail_url", "title", "updated_at", "views") SELECT "author", "duration_ms", "id", "lastfm_id", "published_at", "spotify_id", "thumbnail_url", "title", "updated_at", "views" FROM "YoutubeVideo";
DROP TABLE "YoutubeVideo";
ALTER TABLE "new_YoutubeVideo" RENAME TO "YoutubeVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
