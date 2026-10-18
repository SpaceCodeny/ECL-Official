import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TeamsService } from "./teams.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("teams")
@Controller("teams")
export class TeamsController {
  constructor(private readonly svc: TeamsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lista equipes com filtros" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.list({ page: Number(page ?? 1), pageSize: Number(pageSize ?? 20), search });
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Detalhes de uma equipe pelo slug" })
  findBySlug(@Param("slug") slug: string) {
    return this.svc.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cria uma equipe" })
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.svc.create(body as never, user);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualiza dados da equipe" })
  update(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.svc.update(id, body as never, user);
  }

  @Post(":id/invitations")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Convida um jogador para a equipe" })
  invite(
    @Param("id") teamId: string,
    @Body() body: { email: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.invitePlayer(teamId, body.email, user);
  }

  @Delete(":id/members/:playerId")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove um jogador da equipe" })
  removeMember(
    @Param("id") teamId: string,
    @Param("playerId") playerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.removeMember(teamId, playerId, user);
  }
}
