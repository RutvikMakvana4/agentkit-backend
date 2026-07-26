import type { ToolDefinition } from '../types/agent.types.js';

async function searchProductsInExistingBackend(query: string) {
  const catalog = [
    { name: 'Trail Runner Pro', category: 'shoes', price: 89 },
    { name: 'City Sneaker', category: 'shoes', price: 65 },
    { name: 'Trail Backpack 20L', category: 'bags', price: 74 },
  ];

  const results = catalog.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return results.length > 0 ? results : catalog.slice(0, 2);
}

export const searchProductsTool: ToolDefinition = {
  id: 'tool_searchProducts',
  name: 'searchProducts',
  description: 'Search products by name, category, or keyword',
  permission: 'read',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keywords, e.g. "black running shoe"',
      },
    },
    required: ['query'],
  },
  async execute(args) {
    const query = String(args.query ?? '');
    const results = await searchProductsInExistingBackend(query);
    return { query, results };
  },
};
