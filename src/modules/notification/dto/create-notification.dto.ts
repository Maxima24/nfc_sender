import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsJSON, IsOptional, IsString } from 'class-validator';

export class ICreateNotificationDto {
  @ApiProperty({ description: 'Notification type ' })
  @IsEnum(NotificationType)
  type!: NotificationType;
  @ApiProperty({ description: 'The title of the notification' })
  @IsString()
  title!: string;
  @ApiProperty({ description: 'The title of the notification' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: 'The metadata' })
  @IsJSON()
  @IsOptional()
  metadata?: JSON;
}
