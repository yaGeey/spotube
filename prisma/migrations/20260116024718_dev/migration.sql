/*
  Warnings:

  - The primary key for the `Genius` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Genius` table. All the data in the column will be lost.
  - Added the required column `query` to the `Genius` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Genius" (
    "query" TEXT NOT NULL PRIMARY KEY,
    "lyrics" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL,
    "masterTrackId" INTEGER NOT NULL,
    CONSTRAINT "Genius_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Genius" ("fullResponse", "lyrics", "masterTrackId") SELECT "fullResponse", "lyrics", "masterTrackId" FROM "Genius";
DROP TABLE "Genius";
ALTER TABLE "new_Genius" RENAME TO "Genius";
CREATE UNIQUE INDEX "Genius_masterTrackId_key" ON "Genius"("masterTrackId");
CREATE TABLE "new_SpotifyTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL,
    "masterTrackId" INTEGER,
    CONSTRAINT "SpotifyTrack_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpotifyTrack" ("fullResponse", "id", "masterTrackId", "title") SELECT "fullResponse", "id", "masterTrackId", "title" FROM "SpotifyTrack";
DROP TABLE "SpotifyTrack";
ALTER TABLE "new_SpotifyTrack" RENAME TO "SpotifyTrack";
CREATE UNIQUE INDEX "SpotifyTrack_masterTrackId_key" ON "SpotifyTrack"("masterTrackId");
CREATE INDEX "SpotifyTrack_masterTrackId_idx" ON "SpotifyTrack"("masterTrackId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
