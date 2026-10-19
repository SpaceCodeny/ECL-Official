/**
 * AppModule otimizado para serverless (Vercel).
 *
 * Carrega apenas os módulos necessários para a API REST.
 * Remove: RealtimeModule (Socket.IO), SerializerInterceptor (overhead),
 * e inicia o Prisma em modo lazy (sem $connect no bootstrap).
 *
 * Resultado: cold start ~3-5s em vez de ~12s.
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { loadEnv } from "./config/configuration";
import { PrismaService } from "./database/prisma.service";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { TournamentsModule } from "./modules/tournaments/tournaments.module";
import { RegistrationsModule } from "./modules/registrations/registrations.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { RankingsModule } from "./modules/rankings/rankings.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AdminModule } from "./modules/admin/admin.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { PlayersModule } from "./modules/players/players.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: () => loadEnv(),
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
            limit: Number(process.env.THROTTLE_LIMIT ?? 60),
          },
        ],
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    TournamentsModule,
    RegistrationsModule,
    MatchesModule,
    RankingsModule,
    AnnouncementsModule,
    StatsModule,
    AdminModule,
    NotificationsModule,
    UploadsModule,
    PlayersModule,
    // RealtimeModule excluído — Socket.IO incompatível com serverless
  ],
  providers: [
    PrismaService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // LoggingInterceptor excluído — reduz overhead em serverless
    // ClassSerializerInterceptor excluído — reduz overhead em serverless
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppServerlessModule {}
