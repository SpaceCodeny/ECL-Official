import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RankingsService } from "./rankings.service";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("rankings")
@Controller("rankings")
export class RankingsController {
  constructor(private readonly svc: RankingsService) {}

  @Public()
  @Get("teams")
  @ApiOperation({ summary: "Ranking de equipes" })
  teams(@Query("limit") limit?: string, @Query("season") season?: string) {
    return this.svc.getTeamRanking({ limit: limit ? Number(limit) : undefined, season });
  }
}
