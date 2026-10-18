import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export class ForgotPasswordDtoClass {
  static schema = ForgotPasswordSchema;
  @ApiProperty({ example: "player@email.com" })
  email!: string;
}
