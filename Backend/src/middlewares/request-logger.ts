import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, url } = req;
    const { statusCode } = res;

    // Não loga health checks para reduzir ruído
    if (url.startsWith("/health")) return;

    console.log(
      `[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${duration}ms`
    );
  });

  next();
}
