-- AlterTable
ALTER TABLE "MasterTrack" ADD COLUMN "originalArtists" TEXT;
ALTER TABLE "MasterTrack" ADD COLUMN "originalTitle" TEXT;

-- CreateTable
CREATE TABLE "AI" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "model" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
