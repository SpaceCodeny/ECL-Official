import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export class LoginDtoClass {
  static schema = LoginSchema;

  @ApiProperty({ example: "player@email.com" })
  email!: string;

  @ApiProperty({ example: "Senha@123" })
  password!: string;
}
