/*
  Warnings:

  - You are about to drop the column `originalArtists` on the `MasterTrack` table. All the data in the column will be lost.
  - You are about to drop the column `originalTitle` on the `MasterTrack` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MasterTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "thumbnailUrl" TEXT,
    "title" TEXT NOT NULL,
    "titleLatin" TEXT,
    "artists" TEXT NOT NULL,
    "artistsLatin" TEXT,
    "script" TEXT,
    "defaultYtVideoId" TEXT,
    CONSTRAINT "MasterTrack_defaultYtVideoId_fkey" FOREIGN KEY ("defaultYtVideoId") REFERENCES "YoutubeVideo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MasterTrack" ("artists", "defaultYtVideoId", "id", "thumbnailUrl", "title") SELECT "artists", "defaultYtVideoId", "id", "thumbnailUrl", "title" FROM "MasterTrack";
DROP TABLE "MasterTrack";
ALTER TABLE "new_MasterTrack" RENAME TO "MasterTrack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
