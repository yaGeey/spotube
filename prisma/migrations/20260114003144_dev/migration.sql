/*
  Warnings:

  - You are about to drop the `AiData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_SpotifyPlaylistToSpotifyTrack` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_YoutubePlaylistToYoutubeVideo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `full_response` on the `Genius` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `snapshot_id` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `artists` on the `SpotifyTrack` table. All the data in the column will be lost.
  - You are about to drop the column `default_yt_video_id` on the `SpotifyTrack` table. All the data in the column will be lost.
  - You are about to drop the column `full_response` on the `SpotifyTrack` table. All the data in the column will be lost.
  - You are about to drop the column `full_response` on the `YoutubePlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `YoutubePlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `YoutubePlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `author_id` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `duration_ms` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `geniusId` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `lastfm_id` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `published_at` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `spotify_id` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_url` on the `YoutubeVideo` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `YoutubeVideo` table. All the data in the column will be lost.
  - Added the required column `fullResponse` to the `Genius` table without a default value. This is not possible if the table is not empty.
  - Added the required column `masterTrackId` to the `Genius` table without a default value. This is not possible if the table is not empty.
  - Added the required column `masterTrackId` to the `LastFM` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullResponse` to the `SpotifyPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `snapshotId` to the `SpotifyPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullResponse` to the `SpotifyTrack` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullResponse` to the `YoutubePlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `YoutubeVideo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publishedAt` to the `YoutubeVideo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnailUrl` to the `YoutubeVideo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "_SpotifyPlaylistToSpotifyTrack_B_index";

-- DropIndex
DROP INDEX "_SpotifyPlaylistToSpotifyTrack_AB_unique";

-- DropIndex
DROP INDEX "_YoutubePlaylistToYoutubeVideo_B_index";

-- DropIndex
DROP INDEX "_YoutubePlaylistToYoutubeVideo_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AiData";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_SpotifyPlaylistToSpotifyTrack";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_YoutubePlaylistToYoutubeVideo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "MasterTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "defaultYtVideoId" TEXT,
    CONSTRAINT "MasterTrack_defaultYtVideoId_fkey" FOREIGN KEY ("defaultYtVideoId") REFERENCES "YoutubeVideo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "origin" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spotifyMetadataId" TEXT,
    "youtubeMetadataId" TEXT,
    CONSTRAINT "Playlist_spotifyMetadataId_fkey" FOREIGN KEY ("spotifyMetadataId") REFERENCES "SpotifyPlaylist" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Playlist_youtubeMetadataId_fkey" FOREIGN KEY ("youtubeMetadataId") REFERENCES "YoutubePlaylist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlaylistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playlistId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlaylistItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MasterTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_MasterTrackVideos" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_MasterTrackVideos_A_fkey" FOREIGN KEY ("A") REFERENCES "MasterTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_MasterTrackVideos_B_fkey" FOREIGN KEY ("B") REFERENCES "YoutubeVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Genius" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lyrics" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL,
    "masterTrackId" INTEGER NOT NULL,
    CONSTRAINT "Genius_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Genius" ("id", "lyrics") SELECT "id", "lyrics" FROM "Genius";
DROP TABLE "Genius";
ALTER TABLE "new_Genius" RENAME TO "Genius";
CREATE UNIQUE INDEX "Genius_masterTrackId_key" ON "Genius"("masterTrackId");
CREATE TABLE "new_LastFM" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "track" JSONB,
    "album" JSONB,
    "artist" JSONB,
    "masterTrackId" INTEGER NOT NULL,
    CONSTRAINT "LastFM_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LastFM" ("album", "artist", "id", "track") SELECT "album", "artist", "id", "track" FROM "LastFM";
DROP TABLE "LastFM";
ALTER TABLE "new_LastFM" RENAME TO "LastFM";
CREATE UNIQUE INDEX "LastFM_masterTrackId_key" ON "LastFM"("masterTrackId");
CREATE TABLE "new_SpotifyPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL
);
INSERT INTO "new_SpotifyPlaylist" ("id") SELECT "id" FROM "SpotifyPlaylist";
DROP TABLE "SpotifyPlaylist";
ALTER TABLE "new_SpotifyPlaylist" RENAME TO "SpotifyPlaylist";
CREATE TABLE "new_SpotifyTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "fullResponse" JSONB NOT NULL,
    "masterTrackId" INTEGER,
    CONSTRAINT "SpotifyTrack_masterTrackId_fkey" FOREIGN KEY ("masterTrackId") REFERENCES "MasterTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SpotifyTrack" ("id", "title") SELECT "id", "title" FROM "SpotifyTrack";
DROP TABLE "SpotifyTrack";
ALTER TABLE "new_SpotifyTrack" RENAME TO "SpotifyTrack";
CREATE UNIQUE INDEX "SpotifyTrack_masterTrackId_key" ON "SpotifyTrack"("masterTrackId");
CREATE INDEX "SpotifyTrack_masterTrackId_idx" ON "SpotifyTrack"("masterTrackId");
CREATE TABLE "new_YoutubePlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullResponse" JSONB NOT NULL
);
INSERT INTO "new_YoutubePlaylist" ("id") SELECT "id" FROM "YoutubePlaylist";
DROP TABLE "YoutubePlaylist";
ALTER TABLE "new_YoutubePlaylist" RENAME TO "YoutubePlaylist";
CREATE TABLE "new_YoutubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "thumbnailUrl" TEXT NOT NULL
);
INSERT INTO "new_YoutubeVideo" ("author", "id", "title", "views") SELECT "author", "id", "title", "views" FROM "YoutubeVideo";
DROP TABLE "YoutubeVideo";
ALTER TABLE "new_YoutubeVideo" RENAME TO "YoutubeVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_spotifyMetadataId_key" ON "Playlist"("spotifyMetadataId");

-- CreateIndex
CREATE UNIQUE INDEX "Playlist_youtubeMetadataId_key" ON "Playlist"("youtubeMetadataId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistItem_playlistId_position_key" ON "PlaylistItem"("playlistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "_MasterTrackVideos_AB_unique" ON "_MasterTrackVideos"("A", "B");

-- CreateIndex
CREATE INDEX "_MasterTrackVideos_B_index" ON "_MasterTrackVideos"("B");
