import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { toolRegistry } from '../tools/index.js';

export function listTools(_req: Request, res: Response) {
  const tools = toolRegistry.list().map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    permission: tool.permission,
    parameters: tool.parameters,
  }));

  res.status(200).json(new ApiResponse(200, 'Tools fetched', tools));
}
