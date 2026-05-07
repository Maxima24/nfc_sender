import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get analytics for the current user' })
  async getMyAnalytics(@CurrentUser() user: any) {
    return this.analyticsService.getUserAnalytics(user.id);
  }

  @Get('admin')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOperation({ summary: 'Get platform-wide analytics (admin only)' })
  async getAdminAnalytics() {
    return this.analyticsService.getAdminAnalytics();
  }

  @Get('admin/users')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOperation({ summary: 'List users with activity (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAdminUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.analyticsService.getAdminUsers({ page, limit, search });
  }

  @Get('admin/users/:id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOperation({ summary: 'Get full activity for a single user (admin only)' })
  @ApiParam({ name: 'id', required: true, type: String })
  async getAdminUserActivity(@Param('id') id: string) {
    return this.analyticsService.getAdminUserActivity(id);
  }
}
