/*
  Warnings:

  - You are about to drop the column `lastFmId` on the `Artist` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "latinName" TEXT,
    "script" TEXT,
    "spotifyId" TEXT NOT NULL DEFAULT '',
    "geniusId" TEXT,
    "ytChannelId" TEXT NOT NULL DEFAULT '',
    "lastFM" JSONB
);
INSERT INTO "new_Artist" ("geniusId", "id", "latinName", "name", "script", "spotifyId", "ytChannelId") SELECT "geniusId", "id", "latinName", "name", "script", "spotifyId", "ytChannelId" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE UNIQUE INDEX "Artist_name_spotifyId_ytChannelId_key" ON "Artist"("name", "spotifyId", "ytChannelId");
CREATE TABLE "new_Genius" (
    "query" TEXT NOT NULL PRIMARY KEY,
    "lyrics" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL,
    "masterTrackId" INTEGER NOT NULL,
    CONSTRAINT "Genius_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Genius" ("fullResponse", "lyrics", "masterTrackId", "query") SELECT "fullResponse", "lyrics", "masterTrackId", "query" FROM "Genius";
DROP TABLE "Genius";
ALTER TABLE "new_Genius" RENAME TO "Genius";
CREATE UNIQUE INDEX "Genius_masterTrackId_key" ON "Genius"("masterTrackId");
CREATE TABLE "new_LastFM" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "track" JSONB,
    "album" JSONB,
    "artist" JSONB,
    "masterTrackId" INTEGER NOT NULL,
    CONSTRAINT "LastFM_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LastFM" ("album", "artist", "id", "masterTrackId", "track") SELECT "album", "artist", "id", "masterTrackId", "track" FROM "LastFM";
DROP TABLE "LastFM";
ALTER TABLE "new_LastFM" RENAME TO "LastFM";
CREATE UNIQUE INDEX "LastFM_masterTrackId_key" ON "LastFM"("masterTrackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
