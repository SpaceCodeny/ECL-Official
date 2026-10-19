import { z } from "zod";

/**
 * Schema de validação das variáveis de ambiente.
 * Falha rápida e explícita em ambiente inválido.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  APP_NAME: z.string().default("Elite Champions League"),
  APP_URL: z.string().url().default("http://localhost:3001"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  // ─── Banco de dados ─────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  /**
   * URL direta sem pooling — usada pelo Prisma Migrate e prisma studio.
   * No Supabase: porta 5432 (não o pooler 6543).
   * Se não informada, cai para DATABASE_URL.
   */
  DIRECT_URL: z.string().optional(),

  // ─── JWT ────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET deve ter pelo menos 16 caracteres"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET deve ter pelo menos 16 caracteres"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // ─── Admin bootstrap ────────────────────────────────────────────────────────
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().optional(),
  ADMIN_BOOTSTRAP_USERNAME: z.string().optional(),

  // ─── E-mail ─────────────────────────────────────────────────────────────────
  MAIL_PROVIDER: z.enum(["none", "smtp"]).default("none"),
  MAIL_FROM: z.string().default("noreply@ecl.local"),

  // ─── Uploads ────────────────────────────────────────────────────────────────
  /**
   * "local"  → salva em disco (só para dev; efêmero no Railway/Render)
   * "supabase" → usa Supabase Storage (produção)
   */
  UPLOAD_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  UPLOAD_DIR: z.string().default("./uploads"),
  UPLOAD_MAX_SIZE_MB: z.coerce.number().default(5),

  // Supabase Storage — necessário quando UPLOAD_PROVIDER=supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("ecl-assets"),

  // ─── Rate limiting ──────────────────────────────────────────────────────────
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(60),

  // ─── Serverless flag ────────────────────────────────────────────────────────
  SERVERLESS: z.string().optional().transform(v => v === "true"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Carrega e valida as variáveis de ambiente.
 * Lança erro descritivo se houver variáveis inválidas.
 */
function loadEnv(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  return parsed.data;
}

export const config = loadEnv();
