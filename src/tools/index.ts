import { toolRegistry } from './toolRegistry.js';
import { getOrderTool } from './getOrder.tool.js';
import { searchProductsTool } from './searchProducts.tool.js';
import { createSupportTicketTool } from './createSupportTicket.tool.js';
import { requestRefundTool } from './requestRefund.tool.js';

export function registerTools() {
  toolRegistry.register(getOrderTool);
  toolRegistry.register(searchProductsTool);
  toolRegistry.register(createSupportTicketTool);
  toolRegistry.register(requestRefundTool);
}

export { toolRegistry } from './toolRegistry.js';
