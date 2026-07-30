import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { toolRegistry } from '../tools/index.js';
import * as toolService from '../services/tool.service.js';
import { executeRemoteTool } from '../services/remoteToolExecutor.service.js';

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

/** Postman-style tools table for a connected project (§10). */
export async function listProjectTools(req: Request, res: Response) {
  const tools = await toolService.listToolsForProject(req.params.projectId as string);
  res.status(200).json(new ApiResponse(200, 'Project tools fetched', tools));
}

const toggleSchema = z.object({ enabled: z.boolean() });

/** Enable/disable a tool without touching code or redeploying (§10.2). */
export async function setToolEnabled(req: Request, res: Response) {
  const parsed = toggleSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }
  const tool = await toolService.setToolEnabled(req.params.id as string, parsed.data.enabled);
  if (!tool) throw ApiError.notFound(`Tool "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Tool updated', tool));
}

const testCallSchema = z.object({ arguments: z.record(z.string(), z.unknown()).default({}) });

/** "Run test call" — fires a one-off invocation through the remote executor without a full agent session (§10.2). */
export async function testTool(req: Request, res: Response) {
  const parsed = testCallSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const tool = await toolService.getToolById(req.params.id as string);
  if (!tool) throw ApiError.notFound(`Tool "${req.params.id as string}" not found`);

  const start = Date.now();
  try {
    const result = await executeRemoteTool(tool.projectId, tool.name, parsed.data.arguments);
    res.status(200).json(
      new ApiResponse(200, 'Test call completed', {
        status: 'success',
        result,
        durationMs: Date.now() - start,
      }),
    );
  } catch (err) {
    res.status(200).json(
      new ApiResponse(200, 'Test call failed', {
        status: 'error',
        error: err instanceof Error ? err.message : 'Test call failed',
        durationMs: Date.now() - start,
      }),
    );
  }
}
