import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';

export function getHealth(_req: Request, res: Response) {
  res.status(200).json(
    new ApiResponse(200, 'Backend server is running successfully 🚀', {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}
