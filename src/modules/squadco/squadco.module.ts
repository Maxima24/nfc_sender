import { Module } from '@nestjs/common';
import { SquadcoService } from './squadco.service';
import{HttpModule} from "@nestjs/axios"
import { SquadcoController } from './squadco.controller';

@Module({
  imports:[HttpModule],
  controllers: [SquadcoController],
  providers: [SquadcoService],
})
export class SquadcoModule {}
