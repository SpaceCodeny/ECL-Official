import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/database/prisma.service";
import { AuthService } from "./auth.service";

/**
 * Testes do AuthService — verifica lógica de hash e geração de tokens.
 * Usa mocks do Prisma para não depender de banco de dados.
 */
describe("AuthService", () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }; userSession: { updateMany: jest.Mock }; $transaction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userSession: { updateMany: jest.fn() },
      $transaction: jest.fn((args: unknown) => args),
    };

    const jwtMock = { sign: jest.fn(() => "token"), decode: jest.fn(() => ({ exp: 1000, iat: 0 })) };
    const configMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          JWT_ACCESS_SECRET: "test-access-secret-16chars",
          JWT_REFRESH_SECRET: "test-refresh-secret-16chars",
          JWT_ACCESS_TTL: "15m",
          JWT_REFRESH_TTL: "7d",
          MAIL_PROVIDER: "none",
        };
        return map[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe("register", () => {
    it("deve criar usuário com hash de senha e papel VISITOR", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: "1" });

      const result = await service.register({
        username: "newuser",
        email: "new@test.com",
        password: "Senha@123",
        displayName: "New User",
      });

      expect(result.message).toContain("Cadastro realizado");
      expect(prisma.user.create).toHaveBeenCalledTimes(1);

      const created = prisma.user.create.mock.calls[0]?.[0]?.data;
      expect(created?.role).toBe("VISITOR");
      expect(created?.passwordHash).not.toBe("Senha@123");
    });

    it("deve rejeitar e-mail duplicado", async () => {
      prisma.user.findFirst.mockResolvedValue({ email: "dup@test.com" });

      await expect(
        service.register({ username: "dup", email: "dup@test.com", password: "Senha@123", displayName: "Dup" }),
      ).rejects.toThrow("E-mail já cadastrado");
    });
  });

  describe("login", () => {
    it("deve rejeitar credenciais inválidas (usuário inexistente)", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: "no@user.com", password: "x" }),
      ).rejects.toThrow("Credenciais inválidas");
    });
  });
});
