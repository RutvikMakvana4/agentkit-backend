-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('connected', 'stale', 'disconnected');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "framework" TEXT,
    "nodeVersion" TEXT,
    "sdkVersion" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'disconnected',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputExample" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectKey_key" ON "projects"("projectKey");

-- CreateIndex
CREATE INDEX "tools_projectId_idx" ON "tools"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "tools_projectId_name_key" ON "tools"("projectId", "name");

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
