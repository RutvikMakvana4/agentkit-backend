import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Resolves which conversation a chat request belongs to: continues an
 * existing one if `conversationId` was provided (and actually belongs to
 * this agent), otherwise starts a new one. Always returns a valid id, so
 * callers never have to branch on "was this a new conversation."
 */
export async function ensureConversation(
  agentId: string,
  conversationId?: string,
): Promise<string> {
  if (conversationId) {
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!existing) {
      throw ApiError.notFound(`Conversation "${conversationId}" not found`);
    }
    if (existing.agentId !== agentId) {
      throw ApiError.forbidden('This conversation belongs to a different agent');
    }
    return existing.id;
  }

  const created = await prisma.conversation.create({ data: { agentId } });
  return created.id;
}

export async function getConversationHistory(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });
  return messages as ConversationMessage[];
}

export async function appendTurn(
  conversationId: string,
  userMessage: string,
  assistantReply?: string,
): Promise<void> {
  await prisma.message.create({
    data: { conversationId, role: 'user', content: userMessage },
  });

  if (assistantReply) {
    await prisma.message.create({
      data: { conversationId, role: 'assistant', content: assistantReply },
    });
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}
