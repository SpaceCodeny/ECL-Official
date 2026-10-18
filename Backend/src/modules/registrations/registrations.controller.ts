import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RegistrationsService } from "./registrations.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { RegistrationStatus } from "@prisma/client";

@ApiTags("registrations")
@Controller("tournaments/:tournamentId/registrations")
export class RegistrationsController {
  constructor(private readonly svc: RegistrationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Lista inscrições de um campeonato" })
  list(
    @Param("tournamentId") tournamentId: string,
    @Query("status") status?: string,
  ) {
    return this.svc.list(tournamentId, status);
  }

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Inscreve equipe no campeonato" })
  register(
    @Param("tournamentId") tournamentId: string,
    @Body() body: { teamId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.register(tournamentId, body.teamId, user);
  }

  @Post(":registrationId/approve")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Aprova inscrição (admin)" })
  approve(
    @Param("registrationId") regId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.review(regId, RegistrationStatus.APPROVED, user);
  }

  @Post(":registrationId/reject")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rejeita inscrição (admin)" })
  reject(
    @Param("registrationId") regId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.review(regId, RegistrationStatus.REJECTED, user);
  }

  @Post(":registrationId/withdraw")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retira inscrição (capitão ou admin)" })
  withdraw(
    @Param("registrationId") regId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.withdraw(regId, user);
  }
}
