import { Test, TestingModule } from '@nestjs/testing';
import { PayozaController } from './payoza.controller';
import { PayozaService } from './payoza.service';

describe('PayozaController', () => {
  let controller: PayozaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayozaController],
      providers: [PayozaService],
    }).compile();

    controller = module.get<PayozaController>(PayozaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
