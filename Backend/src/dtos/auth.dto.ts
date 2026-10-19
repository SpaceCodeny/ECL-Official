import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("E-mail inválido"),
  username: z
    .string()
    .min(3, "Username deve ter no mínimo 3 caracteres")
    .max(30, "Username deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username pode conter apenas letras, números, _ e -"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
  displayName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token obrigatório"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
