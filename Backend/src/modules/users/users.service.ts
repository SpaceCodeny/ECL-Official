import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/database/prisma.service";

const PUBLIC_FIELDS = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...PUBLIC_FIELDS, email: true, emailVerified: true, lastLoginAt: true },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: PUBLIC_FIELDS,
    });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string | null },
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { ...PUBLIC_FIELDS, email: true },
    });
    return user;
  }
}
