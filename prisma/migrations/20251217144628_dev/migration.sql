/*
  Warnings:

  - You are about to drop the column `thumbnail_url` on the `SpotifyTrack` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpotifyTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "full_response" JSONB NOT NULL
);
INSERT INTO "new_SpotifyTrack" ("artist", "full_response", "id", "title") SELECT "artist", "full_response", "id", "title" FROM "SpotifyTrack";
DROP TABLE "SpotifyTrack";
ALTER TABLE "new_SpotifyTrack" RENAME TO "SpotifyTrack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
