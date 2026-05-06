import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceivedFromDto {
  @ApiProperty({ example: 'Payaza Test Account' })
  @IsString()
  account_name!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  account_number!: string;

  @ApiProperty({ example: 'Payaza Test Bank' })
  @IsString()
  bank_name!: string;
}

export class CustomerDto {
  @ApiProperty({ example: 'user@email.com' })
  @IsEmail()
  email_address!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  last_name!: string;

  @ApiProperty({ example: '08157002782' })
  @IsString()
  mobile_number!: string;
}

export class IHandleWebhookDto {
  @ApiProperty({ example: 'P-C-20260506-G3N918CHAS' })
  @IsString()
  transaction_reference!: string;

  @ApiProperty({ example: 'Funds Received' })
  @IsString()
  transaction_status!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  transaction_fee!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  amount_received!: number;

  @ApiProperty({ example: '2026-05-06 16:51:04' })
  @IsString()
  initiated_date!: string;

  @ApiProperty({ example: '2026-05-06 16:51:20' })
  @IsString()
  current_status_date!: string;

  @ApiProperty({ type: ReceivedFromDto })
  @ValidateNested()
  @Type(() => ReceivedFromDto)
  received_from!: ReceivedFromDto;

  @ApiProperty({ example: '1223JJD' })
  @IsString()
  merchant_reference!: string;

  @ApiProperty({ example: 'Completed' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'Transfer' })
  @IsString()
  channel!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  branch!: boolean;

  @ApiProperty({ example: 'NGN' })
  @IsString()
  currency_code!: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  payaza_account_reference?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiProperty({ example: 262238 })
  @IsNumber()
  business_fk!: number;

  @ApiProperty({ type: CustomerDto })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;

  @ApiProperty({ example: 100 })
  @IsNumber()
  request_amount!: number;

  @ApiProperty({ example: 'EXACT' })
  @IsString()
  amount_validation!: string;
}