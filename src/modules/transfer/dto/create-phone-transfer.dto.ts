import { ApiProperty } from '@nestjs/swagger';
import { TransferType } from '@prisma/client';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class ICreatePhoneTransfer {
  @ApiProperty({
    description: 'Description of transaction',
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Amount to be sent',
  })
  @IsNumber()
  @Min(10)
  amount!: number;

  @ApiProperty({
    description: 'phone number of reciever',
  })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({
    description: 'Transfer Type',
  })
  @IsEnum(TransferType)
  transferType!: TransferType;
}
