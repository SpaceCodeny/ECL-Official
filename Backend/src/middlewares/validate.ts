import type { Request, Response, NextFunction } from "express";
import { type AnyZodObject, ZodError } from "zod";

/**
 * Middleware de validação Zod.
 * Valida req.body contra o schema fornecido.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          statusCode: 400,
          message: "Erro de validação",
          error: "ValidationError",
          details: error.errors.map(e => ({
            path: e.path.join("."),
            message: e.message,
          })),
          timestamp: new Date().toISOString(),
          path: req.url,
        });
        return;
      }
      next(error);
    }
  };
}
