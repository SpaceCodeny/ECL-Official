import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TournamentsService } from "./tournaments.service";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { TournamentStatus } from "@prisma/client";

@ApiTags("tournaments")
@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly svc: TournamentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lista campeonatos com filtros" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.list({ page: Number(page ?? 1), pageSize: Number(pageSize ?? 12), search, status });
  }

  @Public()
  @Get("featured")
  @ApiOperation({ summary: "Campeonato em destaque para a homepage" })
  featured() {
    return this.svc.getFeatured();
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Detalhes de um campeonato pelo slug" })
  findBySlug(@Param("slug") slug: string) {
    return this.svc.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cria um campeonato (admin)" })
  create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.svc.create(body as never, user);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualiza dados do campeonato (admin)" })
  update(@Param("id") id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    return this.svc.update(id, body as never, user);
  }

  @Post(":id/publish")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publica o campeonato" })
  publish(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.PUBLISHED, user);
  }

  @Post(":id/open-registrations")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Abre inscrições" })
  openRegistrations(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.REGISTRATION_OPEN, user);
  }

  @Post(":id/close-registrations")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Encerra inscrições" })
  closeRegistrations(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.REGISTRATION_CLOSED, user);
  }

  @Post(":id/start")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Inicia o campeonato" })
  start(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.IN_PROGRESS, user);
  }

  @Post(":id/complete")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Finaliza o campeonato" })
  complete(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.COMPLETED, user);
  }

  @Post(":id/cancel")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancela o campeonato" })
  cancel(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.transition(id, TournamentStatus.CANCELLED, user);
  }

  @Public()
  @Get(":id/standings")
  @ApiOperation({ summary: "Classificação por grupos" })
  standings(@Param("id") id: string) {
    return this.svc.getStandings(id);
  }

  @Public()
  @Get(":id/bracket")
  @ApiOperation({ summary: "Chaveamento do campeonato" })
  bracket(@Param("id") id: string) {
    return this.svc.getBracket(id);
  }
}
