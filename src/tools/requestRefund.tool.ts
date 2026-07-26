import type { ToolDefinition } from '../types/agent.types.js';

async function requestRefundInExistingBackend(orderId: string) {
  return {
    refundId: `RF-${Math.floor(1000 + Math.random() * 9000)}`,
    orderId,
    status: 'pending_approval',
  };
}

export const requestRefundTool: ToolDefinition = {
  id: 'tool_requestRefund',
  name: 'requestRefund',
  description: 'Request a refund for an order',
  permission: 'write',
  parameters: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The order ID to refund' },
    },
    required: ['orderId'],
  },
  async execute(args) {
    const orderId = String(args.orderId ?? '');
    if (!orderId) {
      throw new Error('orderId is required');
    }
    return requestRefundInExistingBackend(orderId);
  },
};
