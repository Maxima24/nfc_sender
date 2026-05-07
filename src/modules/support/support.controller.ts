import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { ReportFraudDto } from './dto/report-fraud.dto';
import { ContactSupportDto } from './dto/contact-support.dto';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
@UseGuards(JwtGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('report-fraud')
  @ApiOperation({ summary: 'Report fraudulent activity' })
  @ApiResponse({ status: 201, description: 'Fraud report submitted' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async reportFraud(
    @CurrentUser() user: any,
    @Body() dto: ReportFraudDto,
  ) {
    return this.supportService.reportFraud(user.id, dto);
  }

  @Post('contact')
  @ApiOperation({ summary: 'Contact support via live chat or email' })
  @ApiResponse({ status: 201, description: 'Support message sent' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async contact(
    @CurrentUser() user: any,
    @Body() dto: ContactSupportDto,
  ) {
    return this.supportService.contact(user.id, dto);
  }
}
