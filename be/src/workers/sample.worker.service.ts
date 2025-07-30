import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DbService } from "prisma/src/db.service";
@Injectable()
export class SampleWorkerService {
  private readonly logger = new Logger(SampleWorkerService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly db: DbService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS, { name: "getLastClosePrice" })
  async getLastClosePrice() {
    this.logger.log("getLastClosePrice");
    return Promise.resolve();
  }
}
