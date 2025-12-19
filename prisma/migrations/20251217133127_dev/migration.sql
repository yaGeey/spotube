/*
  Warnings:

  - You are about to drop the column `full_response` on the `SpotifyPlaylist` table. All the data in the column will be lost.
  - Added the required column `url` to the `SpotifyPlaylist` table without a default value. This is not possible if the table is not empty.

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
    "url" TEXT NOT NULL
);
INSERT INTO "new_SpotifyPlaylist" ("id", "owner", "snapshot_id", "thumbnail_url", "title") SELECT "id", "owner", "snapshot_id", "thumbnail_url", "title" FROM "SpotifyPlaylist";
DROP TABLE "SpotifyPlaylist";
ALTER TABLE "new_SpotifyPlaylist" RENAME TO "SpotifyPlaylist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
