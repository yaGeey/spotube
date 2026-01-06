-- CreateTable
CREATE TABLE "AiData" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "response" JSONB NOT NULL
);
