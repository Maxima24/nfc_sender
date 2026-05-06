import { Test, TestingModule } from '@nestjs/testing';
import { PhoneTransferController } from './phone-transfer.controller';
import { PhoneTransferService } from './phone-transfer.service';

describe('PhoneTransferController', () => {
  let controller: PhoneTransferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhoneTransferController],
      providers: [PhoneTransferService],
    }).compile();

    controller = module.get<PhoneTransferController>(PhoneTransferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
