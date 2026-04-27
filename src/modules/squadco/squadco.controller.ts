import { Controller } from '@nestjs/common';
import { SquadcoService } from './squadco.service';

@Controller('squadco')
export class SquadcoController {
  constructor(private readonly squadcoService: SquadcoService) {}
}
