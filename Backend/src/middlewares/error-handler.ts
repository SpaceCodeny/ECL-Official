import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Se já foi enviado, delegar para o handler padrão do Express
  if (res.headersSent) {
    return next(err);
  }

  const timestamp = new Date().toISOString();
  const path = req.url;

  // AppError customizado
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      statusCode: err.statusCode,
      message: err.message,
      error: err.name,
      timestamp,
      path,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Erros de validação Zod
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      statusCode: 400,
      message: "Erro de validação",
      error: "ValidationError",
      details: err.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
      })),
      timestamp,
      path,
    };
    res.status(400).json(response);
    return;
  }

  // Erro genérico
  console.error("[ErrorHandler]", err);

  const response: ErrorResponse = {
    statusCode: 500,
    message: process.env.NODE_ENV === "production" 
      ? "Erro interno do servidor" 
      : err.message,
    error: "InternalServerError",
    timestamp,
    path,
  };

  res.status(500).json(response);
}
