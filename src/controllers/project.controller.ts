import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as projectService from '../services/project.service.js';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).default('My Backend'),
});

export async function createProject(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw ApiError.badRequest(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const { project, rawKey } = await projectService.createProject(parsed.data.name);

  // rawKey is returned exactly once, at creation — never persisted or
  // retrievable again (same contract as ApiKey, PRD §16 reuse note).
  res.status(201).json(new ApiResponse(201, 'Project created', { project, projectKey: rawKey }));
}

export async function listProjects(_req: Request, res: Response) {
  const projects = await projectService.listProjects();
  res.status(200).json(new ApiResponse(200, 'Projects fetched', projects));
}

/** Powers the Backend page (§9) — falls back to the most recently created project. */
export async function getCurrentProject(_req: Request, res: Response) {
  const project = await projectService.getLatestProject();
  res.status(200).json(new ApiResponse(200, 'Project fetched', project ?? null));
}

export async function getProject(req: Request, res: Response) {
  const project = await projectService.getProjectById(req.params.id as string);
  if (!project) throw ApiError.notFound(`Project "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Project fetched', project));
}

/** Polled every 2s by the onboarding wizard (§8.1). */
export async function getConnectionStatus(req: Request, res: Response) {
  const project = await projectService.getProjectById(req.params.id as string);
  if (!project) throw ApiError.notFound(`Project "${req.params.id as string}" not found`);
  res.status(200).json(
    new ApiResponse(200, 'Connection status fetched', {
      status: project.status,
      toolCount: project.toolCount,
      lastSeenAt: project.lastSeenAt,
    }),
  );
}
