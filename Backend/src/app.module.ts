import { ClassSerializerInterceptor, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
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

// RealtimeModule usa Socket.IO — incompatível com serverless (Vercel).
// Importado condicionalmente via variável SERVERLESS=true.
const conditionalModules = process.env.SERVERLESS === "true"
  ? []
  : (() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RealtimeModule } = require("./modules/realtime/realtime.module") as { RealtimeModule: unknown };
      return [RealtimeModule as never];
    })();

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
    ...conditionalModules,
    UploadsModule,
    PlayersModule,
  ],
  controllers: [],
  providers: [
    PrismaService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
