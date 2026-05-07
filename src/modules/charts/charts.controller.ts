import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChartsService } from './charts.service';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';

const periodApiQuery = {
  name: 'period',
  required: false,
  enum: ['7d', '30d', '90d', '1y'],
} as const;

@ApiTags('Charts')
@ApiBearerAuth()
@Controller('charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  @Get('spending')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Spending chart for the current user (inflow/outflow)' })
  @ApiQuery(periodApiQuery)
  @ApiResponse({ status: 200, description: 'Spending chart data' })
  async getSpending(
    @CurrentUser() user: any,
    @Query('period') period?: string,
  ) {
    return this.chartsService.getSpending(user.id, period);
  }

  @Get('transfers')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Transfer breakdown for the current user' })
  @ApiQuery(periodApiQuery)
  @ApiResponse({ status: 200, description: 'Transfer chart data' })
  async getTransfers(
    @CurrentUser() user: any,
    @Query('period') period?: string,
  ) {
    return this.chartsService.getTransfers(user.id, period);
  }

  @Get('topups')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Top-up trend for the current user' })
  @ApiQuery(periodApiQuery)
  @ApiResponse({ status: 200, description: 'Top-up chart data' })
  async getTopUps(
    @CurrentUser() user: any,
    @Query('period') period?: string,
  ) {
    return this.chartsService.getTopUps(user.id, period);
  }

  @Get('admin/overview')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOperation({ summary: 'Platform-wide chart overview (admin only)' })
  @ApiQuery(periodApiQuery)
  @ApiResponse({ status: 200, description: 'Admin chart overview' })
  async getAdminOverview(@Query('period') period?: string) {
    return this.chartsService.getAdminOverview(period);
  }
}
