import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: JwtPayload, params: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
    const { page = 1, pageSize = 20, unreadOnly } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      userId: user.sub,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: user.sub, read: false } }),
    ]);

    return { data: notifications, total, unreadCount, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async markAsRead(notificationId: string, user: JwtPayload) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException("Notificação não encontrada");
    if (notification.userId !== user.sub) throw new NotFoundException("Notificação não encontrada");

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(user: JwtPayload) {
    await this.prisma.notification.updateMany({
      where: { userId: user.sub, read: false },
      data: { read: true },
    });
    return { message: "Todas as notificações marcadas como lidas" };
  }

  /**
   * Cria uma notificação para um usuário. Usado internamente pelos serviços
   * (inscrição aprovada, partida agendada, resultado publicado, etc.).
   */
  async createForUser(
    userId: string,
    data: { title: string; body: string; type: string; entityId?: string },
  ) {
    return this.prisma.notification.create({
      data: { userId, ...data },
    });
  }
}
