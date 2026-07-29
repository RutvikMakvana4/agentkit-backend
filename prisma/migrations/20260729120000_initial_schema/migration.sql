-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('running', 'success', 'error');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('success', 'error');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "status" "AgentStatus" NOT NULL DEFAULT 'active',
    "tools" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "conversationId" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'running',
    "input" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tool_calls" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "durationMs" INTEGER NOT NULL,
    "status" "ToolCallStatus" NOT NULL DEFAULT 'success',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "keyPreview" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversations_agentId_idx" ON "conversations"("agentId");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "executions_agentId_idx" ON "executions"("agentId");
CREATE INDEX "executions_conversationId_idx" ON "executions"("conversationId");
CREATE INDEX "tool_calls_executionId_idx" ON "tool_calls"("executionId");
CREATE UNIQUE INDEX "api_keys_hashedKey_key" ON "api_keys"("hashedKey");
CREATE INDEX "api_keys_agentId_idx" ON "api_keys"("agentId");

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "executions" ADD CONSTRAINT "executions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
