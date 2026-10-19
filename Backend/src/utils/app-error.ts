/**
 * Classe de erro customizada para a aplicação.
 * Permite criar erros tipados com status HTTP e nome customizado.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public override readonly name: string = "AppError"
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  // Atalhos para erros comuns
  static badRequest(message: string): AppError {
    return new AppError(message, 400, "BadRequest");
  }

  static unauthorized(message: string = "Não autorizado"): AppError {
    return new AppError(message, 401, "Unauthorized");
  }

  static forbidden(message: string = "Acesso negado"): AppError {
    return new AppError(message, 403, "Forbidden");
  }

  static notFound(message: string = "Recurso não encontrado"): AppError {
    return new AppError(message, 404, "NotFound");
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409, "Conflict");
  }

  static unprocessable(message: string): AppError {
    return new AppError(message, 422, "UnprocessableEntity");
  }

  static internal(message: string = "Erro interno do servidor"): AppError {
    return new AppError(message, 500, "InternalServerError");
  }
}

/**
 * Extrai um único valor de string de req.params[key].
 * Express pode retornar string | string[] dependendo da rota.
 */
export function getParam(params: Record<string, any>, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
