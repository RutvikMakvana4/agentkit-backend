import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as executionService from '../services/execution.service.js';

export async function listExecutions(_req: Request, res: Response) {
  const executions = await executionService.listExecutions();
  res.status(200).json(new ApiResponse(200, 'Executions fetched', executions));
}

export async function listExecutionsForAgent(req: Request, res: Response) {
  const executions = await executionService.listExecutionsByAgent(req.params.id as string);
  res.status(200).json(new ApiResponse(200, 'Executions fetched', executions));
}

export async function getExecution(req: Request, res: Response) {
  const execution = await executionService.getExecutionById(req.params.id as string);
  if (!execution) throw ApiError.notFound(`Execution "${req.params.id as string}" not found`);
  res.status(200).json(new ApiResponse(200, 'Execution fetched', execution));
}
