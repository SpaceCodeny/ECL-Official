import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PlayersService } from "./players.service";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UserRole, PlayerStatus } from "@prisma/client";

@ApiTags("players")
@ApiBearerAuth()
@Controller("admin/players")
@Roles(UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)
export class PlayersController {
  constructor(private readonly svc: PlayersService) {}

  @Get()
  @ApiOperation({ summary: "Lista jogadores com filtros" })
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listPlayers({
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 30),
      search,
      status: status as PlayerStatus | undefined,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cria jogador com conta de login (admin)" })
  create(@Body() body: unknown, @CurrentUser() actor: JwtPayload) {
    return this.svc.adminCreatePlayer(body as never, actor);
  }

  @Get(":userId")
  @ApiOperation({ summary: "Detalhes do jogador com histórico" })
  detail(@Param("userId") userId: string) {
    return this.svc.getPlayerDetail(userId);
  }

  @Post(":userId/transfer")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Transfere jogador para time ou envia para o banco" })
  transfer(
    @Param("userId") userId: string,
    @Body() body: { toTeamId: string | null; force?: boolean },
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.svc.transferPlayer(userId, body, actor);
  }
}
