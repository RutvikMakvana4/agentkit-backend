import type { ToolDefinition } from '../types/agent.types.js';

async function createTicketInExistingBackend(orderId: string, issue: string) {
  return {
    ticketId: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId,
    issue,
    status: 'open',
  };
}

export const createSupportTicketTool: ToolDefinition = {
  id: 'tool_createSupportTicket',
  name: 'createSupportTicket',
  description: 'Create a support ticket for an order issue',
  permission: 'write',
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The related order ID' },
      issue: { type: 'string', description: 'A short description of the issue' },
    },
    required: ['orderId', 'issue'],
  },
  async execute(args) {
    const orderId = String(args.orderId ?? '');
    const issue = String(args.issue ?? '');
    if (!orderId || !issue) {
      throw new Error('orderId and issue are required');
    }
    return createTicketInExistingBackend(orderId, issue);
  },
};
