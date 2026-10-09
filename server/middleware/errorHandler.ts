import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '../types/index.js';

export function errorHandler(err: any, req: Request, res: Response<APIResponse<null>>, next: NextFunction) {
  // Handle JSON parsing errors from express.json() / body-parser
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err && ((err as any).status === 400 || (err as any).statusCode === 400))) {
    console.warn(`[Bad Request]: Invalid JSON in body on ${req.method} ${req.url}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body'
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[Server Error]:', err);
  } else {
    console.warn(`[Client Error ${statusCode}]:`, err.message || err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
}
