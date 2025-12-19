/*
  Warnings:

  - Added the required column `snapshot_id` to the `SpotifyPlaylist` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SpotifyPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshot_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "full_response" JSONB NOT NULL
);
INSERT INTO "new_SpotifyPlaylist" ("full_response", "id", "owner", "title") SELECT "full_response", "id", "owner", "title" FROM "SpotifyPlaylist";
DROP TABLE "SpotifyPlaylist";
ALTER TABLE "new_SpotifyPlaylist" RENAME TO "SpotifyPlaylist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
