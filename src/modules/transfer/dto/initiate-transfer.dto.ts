import { ApiProperty } from '@nestjs/swagger';
import { TransferType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class InitiateTransferDto {
 

  @ApiProperty({ description: 'Amount', example: '1000' })
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  amount!: number;


   @ApiProperty({ description: 'Desciption', example: 'Sent for borrowed funds' })
   @IsOptional()
   @IsString()
   description?:string

    @ApiProperty({ description: 'Select the transfer type'})
    @IsEnum(TransferType)
    transferType!:TransferType



}
