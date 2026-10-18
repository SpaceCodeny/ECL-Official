import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MatchesService } from "./matches.service";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("matches")
@Controller("matches")
export class MatchesController {
  constructor(private readonly svc: MatchesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lista partidas com filtros" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("tournamentId") tournamentId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.svc.list({
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20),
      status,
      tournamentId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Detalhes de uma partida" })
  findById(@Param("id") id: string) {
    return this.svc.findById(id);
  }

  @Post(":id/results")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Registra resultado de uma partida (árbitro/admin)" })
  submitResult(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.submitResult(id, body as never, user);
  }

  @Post(":id/disputes")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Abre uma contestação para a partida" })
  openDispute(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.openDispute(id, body.reason, user);
  }
}
