import { Module } from '@nestjs/common';
import { SquadcoService } from './squadco.service';
import { SquadcoController } from './squadco.controller';

@Module({
  controllers: [SquadcoController],
  providers: [SquadcoService],
})
export class SquadcoModule {}
