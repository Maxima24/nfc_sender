import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IUpdateFcmTokenDto {
  @ApiProperty({ description: 'The device token from fcm' })
  @IsString()
  deviceToken!: string;

  @ApiProperty({ description: 'THe device id ' })
  @IsString()
  deviceId!: string;
}
