/*
  Warnings:

  - You are about to drop the column `artists` on the `MasterTrack` table. All the data in the column will be lost.
  - You are about to drop the column `artistsLatin` on the `MasterTrack` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "latinName" TEXT,
    "script" TEXT,
    "spotifyId" TEXT NOT NULL DEFAULT '',
    "lastFmId" TEXT,
    "geniusId" TEXT,
    "ytChannelId" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "ArtistLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "artistId" INTEGER NOT NULL,
    CONSTRAINT "ArtistLink_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CombinedPlaylist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_ArtistToMasterTrack" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ArtistToMasterTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ArtistToMasterTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "MasterTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CombinedPlaylistToPlaylist" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_CombinedPlaylistToPlaylist_A_fkey" FOREIGN KEY ("A") REFERENCES "CombinedPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CombinedPlaylistToPlaylist_B_fkey" FOREIGN KEY ("B") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MasterTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "thumbnailUrl" TEXT,
    "title" TEXT NOT NULL,
    "titleLatin" TEXT,
    "script" TEXT,
    "defaultYtVideoId" TEXT,
    CONSTRAINT "MasterTrack_defaultYtVideoId_fkey" FOREIGN KEY ("defaultYtVideoId") REFERENCES "YoutubeVideo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MasterTrack" ("defaultYtVideoId", "id", "script", "thumbnailUrl", "title", "titleLatin") SELECT "defaultYtVideoId", "id", "script", "thumbnailUrl", "title", "titleLatin" FROM "MasterTrack";
DROP TABLE "MasterTrack";
ALTER TABLE "new_MasterTrack" RENAME TO "MasterTrack";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Artist_name_spotifyId_ytChannelId_key" ON "Artist"("name", "spotifyId", "ytChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "_ArtistToMasterTrack_AB_unique" ON "_ArtistToMasterTrack"("A", "B");

-- CreateIndex
CREATE INDEX "_ArtistToMasterTrack_B_index" ON "_ArtistToMasterTrack"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CombinedPlaylistToPlaylist_AB_unique" ON "_CombinedPlaylistToPlaylist"("A", "B");

-- CreateIndex
CREATE INDEX "_CombinedPlaylistToPlaylist_B_index" ON "_CombinedPlaylistToPlaylist"("B");
