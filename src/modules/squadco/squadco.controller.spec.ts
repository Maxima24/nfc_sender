import { Test, TestingModule } from '@nestjs/testing';
import { SquadcoController } from './squadco.controller';
import { SquadcoService } from './squadco.service';

describe('SquadcoController', () => {
  let controller: SquadcoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SquadcoController],
      providers: [SquadcoService],
    }).compile();

    controller = module.get<SquadcoController>(SquadcoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
