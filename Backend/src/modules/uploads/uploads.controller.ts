import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { memoryStorage } from "multer";
import { StorageService } from "./storage.service";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@prisma/client";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_SIZE_BYTES =
  (parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? "5", 10)) * 1024 * 1024;

function mimeFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (e: Error | null, ok: boolean) => void,
) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Tipo de arquivo não permitido: ${file.mimetype}. Envie PNG, JPG, WEBP, GIF ou SVG.`,
      ) as unknown as Error,
      false,
    );
  }
}

@ApiTags("uploads")
@ApiBearerAuth()
@Controller("uploads")
@Roles(UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post("team-logo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Upload de logo de equipe (admin)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      // memoryStorage: buffer na memória → compatível com local e Supabase
      storage: memoryStorage(),
      fileFilter: mimeFilter,
      limits: { fileSize: MAX_SIZE_BYTES },
    }),
  )
  async uploadTeamLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) throw new BadRequestException("Nenhum arquivo enviado");
    const url = await this.storage.store(file.buffer, file.originalname, "teams");
    return { url };
  }
}
