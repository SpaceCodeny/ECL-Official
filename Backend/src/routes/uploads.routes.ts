import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { UserRole } from "@prisma/client";
import { prisma } from "../database/prisma";
import { authenticate } from "../middlewares/auth";
import { AppError, getParam } from "../utils/app-error";
import { config } from "../config/environment";

export const uploadsRouter = Router();

// ─── Configuração do Multer ───────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = config.UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(config.UPLOAD_DIR, "teams");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: config.SERVERLESS ? multer.memoryStorage() : storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.", 400, "BadRequest"));
    }
  },
});

// Upload para Supabase Storage
async function uploadToSupabase(file: Express.Multer.File, bucket: string, folder: string): Promise<string> {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    throw AppError.internal("Supabase não configurado");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${folder}/${crypto.randomUUID()}${ext}`;

  const fileBuffer = file.buffer ?? fs.readFileSync(file.path);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, fileBuffer, { contentType: file.mimetype, upsert: false });

  if (error) throw AppError.internal(`Erro ao fazer upload: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * @openapi
 * /api/v1/uploads/avatar:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload de avatar do usuário
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar enviado com sucesso
 */
uploadsRouter.post(
  "/avatar",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw AppError.badRequest("Nenhum arquivo enviado");

      let url: string;

      if (config.UPLOAD_PROVIDER === "supabase") {
        url = await uploadToSupabase(req.file, config.SUPABASE_STORAGE_BUCKET, "avatars");
      } else {
        url = `/uploads/teams/${req.file.filename}`;
      }

      await prisma.user.update({
        where: { id: req.user!.sub },
        data: { avatarUrl: url },
      });

      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/uploads/team-logo:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload de logo de time
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               teamId:
 *                 type: string
 *                 description: Opcional ao criar nova equipe; obrigatório ao atualizar
 *     responses:
 *       200:
 *         description: Logo enviado com sucesso
 */
uploadsRouter.post(
  "/team-logo",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw AppError.badRequest("Nenhum arquivo enviado");
      const { teamId } = req.body as { teamId?: string };

      // Se teamId fornecido, validar permissões
      if (teamId) {
        const team = await prisma.team.findFirst({
          where: { id: teamId, deletedAt: null },
        });
        if (!team) throw AppError.notFound("Time não encontrado");

        const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
        if (team.captainId !== req.user!.sub && !isAdmin) {
          throw AppError.forbidden("Apenas o capitão pode alterar o logo");
        }
      } else {
        // Se não tem teamId, apenas admin pode fazer upload (para criação de equipe)
        const isAdmin = (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.ADMINISTRATOR);
        if (!isAdmin) {
          throw AppError.forbidden("Apenas administradores podem fazer upload sem teamId");
        }
      }

      let url: string;

      if (config.UPLOAD_PROVIDER === "supabase") {
        url = await uploadToSupabase(req.file, config.SUPABASE_STORAGE_BUCKET, "logos");
      } else {
        url = `/uploads/teams/${req.file.filename}`;
      }

      // Se teamId fornecido, atualizar o team
      if (teamId) {
        await prisma.team.update({
          where: { id: teamId },
          data: { logoUrl: url },
        });
      }

      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @openapi
 * /api/v1/uploads/tournament-banner:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload de banner de torneio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - tournamentId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               tournamentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Banner enviado com sucesso
 */
uploadsRouter.post(
  "/tournament-banner",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw AppError.badRequest("Nenhum arquivo enviado");
      const { tournamentId } = req.body as { tournamentId?: string };
      if (!tournamentId) throw AppError.badRequest("tournamentId é obrigatório");

      const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMINISTRATOR, UserRole.TOURNAMENT_ORGANIZER]
        .includes(req.user!.role as any);
      if (!isAdmin) throw AppError.forbidden("Apenas administradores podem alterar banners");

      const tournament = await prisma.tournament.findFirst({
        where: { id: tournamentId, deletedAt: null },
      });
      if (!tournament) throw AppError.notFound("Torneio não encontrado");

      let url: string;

      if (config.UPLOAD_PROVIDER === "supabase") {
        url = await uploadToSupabase(req.file, config.SUPABASE_STORAGE_BUCKET, "banners");
      } else {
        url = `/uploads/teams/${req.file.filename}`;
      }

      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { bannerUrl: url },
      });

      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);
