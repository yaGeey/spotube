-- CreateTable
CREATE TABLE "SpotifyTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "full_response" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "YoutubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,
    "published_at" DATETIME NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "statistics" JSONB NOT NULL,
    "full_response" JSONB NOT NULL,
    "spotify_id" TEXT,
    "lastfm_id" INTEGER,
    CONSTRAINT "YoutubeVideo_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "SpotifyTrack" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "YoutubeVideo_lastfm_id_fkey" FOREIGN KEY ("lastfm_id") REFERENCES "LastFM" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LastFM" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "track" JSONB,
    "album" JSONB,
    "artist" JSONB
);

-- CreateTable
CREATE TABLE "YoutubePlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "full_response" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "SpotifyPlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "full_response" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "_YoutubePlaylistToYoutubeVideo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_YoutubePlaylistToYoutubeVideo_A_fkey" FOREIGN KEY ("A") REFERENCES "YoutubePlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_YoutubePlaylistToYoutubeVideo_B_fkey" FOREIGN KEY ("B") REFERENCES "YoutubeVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SpotifyPlaylistToSpotifyTrack" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SpotifyPlaylistToSpotifyTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "SpotifyPlaylist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SpotifyPlaylistToSpotifyTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "SpotifyTrack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_YoutubePlaylistToYoutubeVideo_AB_unique" ON "_YoutubePlaylistToYoutubeVideo"("A", "B");

-- CreateIndex
CREATE INDEX "_YoutubePlaylistToYoutubeVideo_B_index" ON "_YoutubePlaylistToYoutubeVideo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SpotifyPlaylistToSpotifyTrack_AB_unique" ON "_SpotifyPlaylistToSpotifyTrack"("A", "B");

-- CreateIndex
CREATE INDEX "_SpotifyPlaylistToSpotifyTrack_B_index" ON "_SpotifyPlaylistToSpotifyTrack"("B");
