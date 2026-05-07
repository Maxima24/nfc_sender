import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('export')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Export user transactions as CSV or PDF' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'pdf'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'transfers', 'topups'] })
  @ApiResponse({ status: 200, description: 'File stream (CSV or PDF)' })
  async export(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.invoicesService.export(
      user.id,
      { format, startDate, endDate, type },
      res,
    );
  }
}
