import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum SupportContactType {
  LIVE_CHAT = 'live_chat',
  EMAIL = 'email',
}

export class ContactSupportDto {
  @ApiProperty({ enum: SupportContactType })
  @IsEnum(SupportContactType)
  type!: SupportContactType;

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
