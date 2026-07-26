import type { ToolDefinition } from '../types/agent.types.js';

// Stand-in for an existing order service/DB call. Replace this function's
// body with the real lookup (Prisma, an internal API call, etc.) — the tool
// wrapper below never needs to change.
async function getOrderFromExistingBackend(orderId: string) {
  const mockOrders: Record<string, { status: string; estimatedDelivery: string }> = {
    '123': { status: 'shipped', estimatedDelivery: '2026-07-25' },
    '456': { status: 'out_for_delivery', estimatedDelivery: '2026-07-22' },
    '998': { status: 'refund_requested', estimatedDelivery: '—' },
  };

  return (
    mockOrders[orderId] ?? {
      status: 'processing',
      estimatedDelivery: 'unknown',
    }
  );
}

export const getOrderTool: ToolDefinition = {
  id: 'tool_getOrder',
  name: 'getOrder',
  description: 'Get order details (status, estimated delivery) by order ID',
  permission: 'read',
  parameters: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'The order ID to look up, e.g. "123"',
      },
    },
    required: ['orderId'],
  },
  async execute(args) {
    const orderId = String(args.orderId ?? '');
    if (!orderId) {
      throw new Error('orderId is required');
    }
    const order = await getOrderFromExistingBackend(orderId);
    return { orderId, ...order };
  },
};
