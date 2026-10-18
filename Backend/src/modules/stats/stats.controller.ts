import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StatsService } from "./stats.service";
import { Public } from "@/common/decorators/public.decorator";

@ApiTags("stats")
@Controller("stats")
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Estatísticas gerais da organização" })
  getStats() {
    return this.svc.getOrganizationStats();
  }
}
