import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import { ZodError, ZodType } from "zod";

/**
 * Convenção: DTOs que declaram uma propriedade estática `schema: ZodType`
 * são validados automaticamente por este pipe global.
 */
interface ZodValidated {
  schema?: ZodType;
}

/**
 * Pipe de validação global baseado em Zod.
 * Valida apenas payloads cujo metatype expõe um `schema` Zod estático;
 * caso contrário, passa o valor inalterado (comportamento opt-in).
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { type, metatype } = metadata;
    // Validação se aplica ao corpo da requisição com DTO tipado.
    if (type !== "body" || !metatype) return value;

    const dtoCtor = metatype as unknown as ZodValidated;
    const schema = dtoCtor.schema;
    if (!schema || !(schema instanceof ZodType)) return value;

    const result = schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Falha de validação",
        errors: this.format(result.error),
      });
    }
    return result.data;
  }

  private format(error: ZodError): Record<string, string> {
    const formatted: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_";
      formatted[path] = issue.message;
    }
    return formatted;
  }
}
