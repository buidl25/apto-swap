import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [DbService, ConfigService],
  exports: [DbService],
})
export class DbModule {}