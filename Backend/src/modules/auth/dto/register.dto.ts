import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e underscore"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(128, "Máximo 128 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
  displayName: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export class RegisterDtoClass {
  static schema = RegisterSchema;

  @ApiProperty({ example: "player123" })
  username!: string;

  @ApiProperty({ example: "player@email.com" })
  email!: string;

  @ApiProperty({ example: "Senha@123" })
  password!: string;

  @ApiProperty({ example: "Player Name" })
  displayName!: string;
}
