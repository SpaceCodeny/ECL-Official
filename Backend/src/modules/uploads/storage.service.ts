import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import type { EnvConfig } from "@/config/configuration";

/**
 * Serviço de armazenamento desacoplado.
 *
 * UPLOAD_PROVIDER=local   → salva em disco (dev / servidores com volume persistente)
 * UPLOAD_PROVIDER=supabase → envia para Supabase Storage (produção no Railway/Render)
 *
 * A interface é a mesma — o controller não sabe qual provider está ativo.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: "local" | "supabase";
  private readonly appUrl: string;
  private readonly uploadDir: string;
  private readonly bucket: string;
  private supabase?: SupabaseClient;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.provider = config.get("UPLOAD_PROVIDER", { infer: true });
    this.appUrl = config.get("APP_URL", { infer: true });
    this.uploadDir = config.get("UPLOAD_DIR", { infer: true });
    this.bucket = config.get("SUPABASE_STORAGE_BUCKET", { infer: true });

    if (this.provider === "supabase") {
      const url = config.get("SUPABASE_URL", { infer: true });
      const key = config.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true });
      if (!url || !key) {
        throw new Error(
          "UPLOAD_PROVIDER=supabase requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
        );
      }
      this.supabase = createClient(url, key);
      this.logger.log("Storage: Supabase Storage ativo");
    } else {
      this.logger.log(`Storage: disco local (${this.uploadDir})`);
    }
  }

  /**
   * Armazena um buffer de imagem e retorna a URL pública.
   * @param buffer  Conteúdo do arquivo
   * @param originalName Nome original (para extrair extensão)
   * @param folder  Subpasta (ex.: "teams")
   */
  async store(buffer: Buffer, originalName: string, folder: string): Promise<string> {
    const ext = extname(originalName).toLowerCase();
    const filename = `${randomUUID()}${ext}`;

    if (this.provider === "supabase") {
      return this.storeSupabase(buffer, filename, folder, ext);
    }
    return this.storeDisk(buffer, filename, folder);
  }

  // ─── Local ──────────────────────────────────────────────────────────────────

  private storeDisk(buffer: Buffer, filename: string, folder: string): string {
    const dir = join(this.uploadDir, folder);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    return `${this.appUrl}/uploads/${folder}/${filename}`;
  }

  // ─── Supabase Storage ────────────────────────────────────────────────────────

  private async storeSupabase(
    buffer: Buffer,
    filename: string,
    folder: string,
    ext: string,
  ): Promise<string> {
    const path = `${folder}/${filename}`;
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeMap[ext] ?? "application/octet-stream";

    const { error } = await this.supabase!.storage
      .from(this.bucket)
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      this.logger.error("Falha no upload para Supabase Storage:", error.message);
      throw new ServiceUnavailableException("Falha ao armazenar arquivo. Tente novamente.");
    }

    const { data } = this.supabase!.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
