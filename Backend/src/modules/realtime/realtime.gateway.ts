import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@/database/prisma.service";
import type { EnvConfig } from "@/config/configuration";

/**
 * Gateway de tempo real — Socket.IO.
 *
 * Canais:
 *  - "live:{matchId}" → placares ao vivo de uma partida específica.
 *  - "tournament:{tournamentId}" → status de partidas de um campeonato.
 *  - "user:{userId}" → notificações pessoais do usuário.
 *
 * A permissão de acesso a cada canal é verificada no servidor (handleConnection).
 */
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((s) => s.trim()),
    credentials: true,
  },
  namespace: "realtime",
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.emit("error", { message: "Token não fornecido" });
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token, {
        secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      });

      // Verifica se o usuário ainda existe e está ativo.
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, status: true, role: true },
      });

      if (!user || user.status !== "ACTIVE") {
        client.emit("error", { message: "Conta inativa" });
        client.disconnect();
        return;
      }

      // Anexa dados do usuário ao socket para uso posterior.
      (client.data as { user: typeof user }).user = user;
      // Entra automaticamente no canal pessoal de notificações.
      void client.join(`user:${user.id}`);
      this.logger.log(`Cliente conectado: ${payload.username}`);
    } catch {
      client.emit("error", { message: "Token inválido" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Inscrição em canal de partida ao vivo.
   * Permissão: qualquer usuário autenticado pode acompanhar placares ao vivo.
   */
  @SubscribeMessage("subscribe:match")
  handleSubscribeMatch(
    @MessageBody() data: { matchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.matchId) return;
    void client.join(`live:${data.matchId}`);
  }

  /**
   * Inscrição em canal de campeonato.
   */
  @SubscribeMessage("subscribe:tournament")
  handleSubscribeTournament(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.tournamentId) return;
    void client.join(`tournament:${data.tournamentId}`);
  }

  /**
   * Sai de um canal.
   */
  @SubscribeMessage("unsubscribe")
  handleUnsubscribe(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.room) return;
    void client.leave(data.room);
  }

  // ─── Emissores para outros serviços ─────────────────────────────────────────

  /** Emite atualização de placar ao vivo para o canal da partida. */
  emitLiveScore(matchId: string, payload: unknown): void {
    this.server.to(`live:${matchId}`).emit("match:score", payload);
  }

  /** Emite mudança de status de partida para o canal do campeonato. */
  emitMatchStatus(tournamentId: string, payload: unknown): void {
    this.server.to(`tournament:${tournamentId}`).emit("match:status", payload);
  }

  /** Emite notificação pessoal para um usuário. */
  emitNotification(userId: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit("notification", payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown>;
    if (typeof auth.token === "string") return auth.token;

    const headers = client.handshake.headers;
    const authHeader = headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return null;
  }
}
