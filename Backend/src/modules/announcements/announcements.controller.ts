import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnnouncementsService } from "./announcements.service";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("announcements")
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lista comunicados" })
  list(@Query("limit") limit?: string, @Query("type") type?: string) {
    return this.svc.list({ limit: limit ? Number(limit) : undefined, type });
  }

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cria comunicado (admin)" })
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.svc.create(body as never, user);
  }
}
