import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDtoClass } from "./dto/login.dto";
import { RegisterDtoClass } from "./dto/register.dto";
import { ForgotPasswordDtoClass } from "./dto/forgot-password.dto";
import { ResetPasswordDtoClass } from "./dto/reset-password.dto";
import { Public } from "@/common/decorators/public.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cadastro de novo usuário" })
  async register(
    @Body() dto: RegisterDtoClass,
    @Req() req: Request,
  ) {
    return this.authService.register(dto, req.ip ?? undefined);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login — retorna access token e refresh token" })
  async login(
    @Body() dto: LoginDtoClass,
    @Req() req: Request,
  ) {
    return this.authService.login(
      dto,
      req.headers["user-agent"],
      req.ip ?? undefined,
    );
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Encerra a sessão (revoga o refresh token)" })
  async logout(@Body() body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renova o access token usando o refresh token" })
  async refresh(
    @Body() body: { refreshToken: string },
    @Req() req: Request,
  ) {
    return this.authService.refresh(
      body.refreshToken,
      req.headers["user-agent"],
      req.ip ?? undefined,
    );
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicita e-mail de redefinição de senha" })
  async forgotPassword(@Body() dto: ForgotPasswordDtoClass) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Redefine senha com token recebido por e-mail" })
  async resetPassword(@Body() dto: ResetPasswordDtoClass) {
    return this.authService.resetPassword(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retorna o perfil do usuário autenticado" })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }
}
