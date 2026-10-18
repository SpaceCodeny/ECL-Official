import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(128)
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export class ResetPasswordDtoClass {
  static schema = ResetPasswordSchema;
  @ApiProperty()
  token!: string;
  @ApiProperty({ example: "NovaSenha@123" })
  password!: string;
}
