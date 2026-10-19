import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request } from "express";

/**
 * Registra o tempo de resposta de cada requisição HTTP.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");
  private readonly isServerless = process.env.SERVERLESS === "true";

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.isServerless) return next.handle(); // sem log em serverless

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          this.logger.debug(`${method} ${url} → ${ms}ms`);
        },
      }),
    );
  }
}
