import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { Roles } from "@/common/decorators/roles.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { UserRole } from "@prisma/client";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@Roles(UserRole.ADMINISTRATOR, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Indicadores e gráficos do painel administrativo" })
  dashboard() {
    return this.svc.getDashboard();
  }

  @Get("users")
  @ApiOperation({ summary: "Lista usuários com filtros" })
  listUsers(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listUsers({ page: Number(page ?? 1), pageSize: Number(pageSize ?? 20), search, role, status });
  }

  @Patch("users/:userId/role")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Altera papel de um usuário (admin)" })
  updateUserRole(
    @Param("userId") userId: string,
    @Body() body: { role: UserRole },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.updateUserRole(userId, body.role, user);
  }

  @Post("users/:userId/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspende um usuário (admin)" })
  suspendUser(@Param("userId") userId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.suspendUser(userId, user);
  }

  @Post("users/:userId/reactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reativa um usuário (admin)" })
  reactivateUser(@Param("userId") userId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.reactivateUser(userId, user);
  }

  @Get("audit-logs")
  @ApiOperation({ summary: "Lista logs de auditoria" })
  listAuditLogs(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("entity") entity?: string,
    @Query("actorId") actorId?: string,
  ) {
    return this.svc.listAuditLogs({ page: Number(page ?? 1), pageSize: Number(pageSize ?? 50), entity, actorId });
  }
}
