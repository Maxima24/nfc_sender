import { Test, TestingModule } from '@nestjs/testing';
import { SquadcoService } from './squadco.service';

describe('SquadcoService', () => {
  let service: SquadcoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SquadcoService],
    }).compile();

    service = module.get<SquadcoService>(SquadcoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
