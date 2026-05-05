// notifications.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notification.service';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';
import { JwtGuard } from 'src/common/utils/jwt.utils';
import { IGetAllNotification } from './dto/get-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({type:IGetAllNotification})
  async getUserNotifications(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      page,
      limit,
      type,
      unreadOnly
    );
  }

  @Get('unread/count')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put(':id/read')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', required: true, type: String })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Put('read/all')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', required: true, type: String })
  async deleteNotification(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.deleteNotification(id, user.id);
  }
}