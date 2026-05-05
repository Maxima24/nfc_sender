import { Test, TestingModule } from '@nestjs/testing';
import { PayozaService } from './payoza.service';

describe('PayozaService', () => {
  let service: PayozaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayozaService],
    }).compile();

    service = module.get<PayozaService>(PayozaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
