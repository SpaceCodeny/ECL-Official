import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Lista notificações do usuário autenticado" })
  list(
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.svc.listForUser(user, {
      page: Number(page ?? 1),
      pageSize: Number(pageSize ?? 20),
      unreadOnly: unreadOnly === "true",
    });
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marca uma notificação como lida" })
  markAsRead(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.markAsRead(id, user);
  }

  @Post("read-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marca todas as notificações como lidas" })
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.svc.markAllAsRead(user);
  }
}
