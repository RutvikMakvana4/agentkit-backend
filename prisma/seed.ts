import { prisma } from '../src/config/prisma.js';

async function main() {
  const existing = await prisma.agent.findFirst({
    where: { name: 'Customer Support Agent' },
  });

  if (existing) {
    console.log('Customer Support Agent already exists, skipping seed.');
    return;
  }

  const agent = await prisma.agent.create({
    data: {
      name: 'Customer Support Agent',
      description: 'Handles order status and support ticket questions',
      instructions: 'You are a helpful customer support agent.',
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      status: 'active',
      tools: [{ toolId: 'tool_getOrder', toolName: 'getOrder' }],
    },
  });

  console.log('Seeded agent:', agent.id, agent.name);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
