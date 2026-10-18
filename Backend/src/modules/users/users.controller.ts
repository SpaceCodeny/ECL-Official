import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Perfil do usuário autenticado" })
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Atualiza perfil do usuário autenticado" })
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = UpdateProfileSchema.parse(body);
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get(":username")
  @ApiOperation({ summary: "Perfil público de um usuário pelo username" })
  findByUsername(@Param("username") username: string) {
    return this.usersService.findByUsername(username);
  }
}
