/*
  Warnings:

  - You are about to drop the column `artist` on the `SpotifyTrack` table. All the data in the column will be lost.
  - Added the required column `artists` to the `SpotifyTrack` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpotifyTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "full_response" JSONB NOT NULL,
    "default_yt_video_id" TEXT,
    CONSTRAINT "SpotifyTrack_default_yt_video_id_fkey" FOREIGN KEY ("default_yt_video_id") REFERENCES "YoutubeVideo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SpotifyTrack" ("default_yt_video_id", "full_response", "id", "title") SELECT "default_yt_video_id", "full_response", "id", "title" FROM "SpotifyTrack";
DROP TABLE "SpotifyTrack";
ALTER TABLE "new_SpotifyTrack" RENAME TO "SpotifyTrack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
