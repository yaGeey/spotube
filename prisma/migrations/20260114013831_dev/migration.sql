-- AlterTable
ALTER TABLE "MasterTrack" ADD COLUMN "thumbnailUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Playlist" (
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
    CONSTRAINT "Playlist_spotifyMetadataId_fkey" FOREIGN KEY ("spotifyMetadataId") REFERENCES "SpotifyPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Playlist_youtubeMetadataId_fkey" FOREIGN KEY ("youtubeMetadataId") REFERENCES "YoutubePlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Playlist" ("createdAt", "description", "id", "origin", "spotifyMetadataId", "thumbnailUrl", "title", "updatedAt", "url", "youtubeMetadataId") SELECT "createdAt", "description", "id", "origin", "spotifyMetadataId", "thumbnailUrl", "title", "updatedAt", "url", "youtubeMetadataId" FROM "Playlist";
DROP TABLE "Playlist";
ALTER TABLE "new_Playlist" RENAME TO "Playlist";
CREATE UNIQUE INDEX "Playlist_spotifyMetadataId_key" ON "Playlist"("spotifyMetadataId");
CREATE UNIQUE INDEX "Playlist_youtubeMetadataId_key" ON "Playlist"("youtubeMetadataId");
CREATE TABLE "new_PlaylistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "position" INTEGER NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playlistId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    CONSTRAINT "PlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaylistItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "MasterTrack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlaylistItem" ("addedAt", "id", "playlistId", "position", "trackId") SELECT "addedAt", "id", "playlistId", "position", "trackId" FROM "PlaylistItem";
DROP TABLE "PlaylistItem";
ALTER TABLE "new_PlaylistItem" RENAME TO "PlaylistItem";
CREATE UNIQUE INDEX "PlaylistItem_playlistId_position_key" ON "PlaylistItem"("playlistId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
