import { Test } from "@nestjs/testing";
import { PrismaService } from "@/database/prisma.service";
import { MatchesService } from "./matches.service";

/**
 * Testes do MatchesService — valida coerência de placar por formato de série.
 */
describe("MatchesService", () => {
  let service: MatchesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    match: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    matchMap: { deleteMany: jest.fn(), createMany: jest.fn() },
    standing: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    matchDispute: { create: jest.fn() },
    $transaction: jest.fn((fn: unknown) => (typeof fn === "function" ? fn(prisma) : fn)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(MatchesService);
  });

  describe("submitResult - validação de placar", () => {
    it("deve aceitar 2-1 para BO3 (série finalizada)", async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: "m1", teamAId: "a", teamBId: "b",
        seriesFormat: "BO3", status: "SCHEDULED", groupId: null,
      });
      prisma.match.update.mockResolvedValue({ id: "m1" });

      await service.submitResult("m1", { scoreA: 2, scoreB: 1 }, { sub: "ref", role: "REFEREE" } as never);
      expect(prisma.match.update).toHaveBeenCalledTimes(1);
    });

    it("deve rejeitar 3-0 para BO1 (excede máximo)", async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: "m2", teamAId: "a", teamBId: "b",
        seriesFormat: "BO1", status: "SCHEDULED", groupId: null,
      });

      await expect(
        service.submitResult("m2", { scoreA: 3, scoreB: 0 }, { sub: "ref", role: "REFEREE" } as never),
      ).rejects.toThrow("Placar inválido para BO1");
    });

    it("deve rejeitar série não finalizada (1-1 em BO3)", async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: "m3", teamAId: "a", teamBId: "b",
        seriesFormat: "BO3", status: "SCHEDULED", groupId: null,
      });

      await expect(
        service.submitResult("m3", { scoreA: 1, scoreB: 1 }, { sub: "ref", role: "REFEREE" } as never),
      ).rejects.toThrow("série finalizada");
    });
  });
});
