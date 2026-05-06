import { Controller, UseGuards } from '@nestjs/common';
import { PhoneTransferService } from './phone-transfer.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ICreatePhoneTransfer } from '../transfer/dto/create-phone-transfer.dto';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';

@ApiTags("Transfer by phone")
@Controller('phone-transfer')
export class PhoneTransferController {
  constructor(private readonly phoneTransferService: PhoneTransferService) {
  }
   
}
