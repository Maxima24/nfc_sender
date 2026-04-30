import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetWalletTransactionsFilter {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'limit to filter transactions ' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'start date to which you want the transactions filtered' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'end date where the filtering stops' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Type of transaction made' ,examples:[TransactionType.CREDIT,TransactionType.DEBIT]})
  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;
}
