-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Playlist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "origin" TEXT NOT NULL,
    "url" TEXT,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
