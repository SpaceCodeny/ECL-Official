import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    statusCode: 404,
    message: `Rota ${req.method} ${req.url} não encontrada`,
    error: "NotFound",
    timestamp: new Date().toISOString(),
    path: req.url,
  });
}
