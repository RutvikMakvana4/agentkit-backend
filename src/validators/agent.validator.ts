import { z } from 'zod';

const agentToolSchema = z.object({
  toolId: z.string().min(1),
  toolName: z.string().min(1),
});

// Base fields with NO defaults — reused by both schemas so `.partial()`
// on the update schema doesn't silently fill in defaults (e.g. `tools: []`)
// for fields the caller simply didn't include in the PATCH body.
const agentFields = {
  name: z.string().min(1, 'name is required'),
  description: z.string(),
  instructions: z.string().min(1, 'instructions is required'),
  model: z.string().min(1, 'model is required'),
  temperature: z.number().min(0).max(2),
  status: z.enum(['active', 'inactive']),
  tools: z.array(agentToolSchema),
};

export const createAgentSchema = z.object(agentFields).extend({
  description: agentFields.description.default(''),
  model: agentFields.model.default('gpt-4.1-mini'),
  temperature: agentFields.temperature.default(0.3),
  status: agentFields.status.optional(),
  tools: agentFields.tools.default([]),
});

export const updateAgentSchema = z.object(agentFields).partial();

export const chatSchema = z.object({
  message: z.string().min(1, 'message is required'),
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
export type ChatDto = z.infer<typeof chatSchema>;
