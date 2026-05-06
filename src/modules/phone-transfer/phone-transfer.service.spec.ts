import { Test, TestingModule } from '@nestjs/testing';
import { PhoneTransferService } from './phone-transfer.service';

describe('PhoneTransferService', () => {
  let service: PhoneTransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhoneTransferService],
    }).compile();

    service = module.get<PhoneTransferService>(PhoneTransferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
