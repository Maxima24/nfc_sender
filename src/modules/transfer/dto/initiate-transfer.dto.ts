import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';

export class InitiateTransferDto {
  @ApiProperty({
    description: "Reciever's Id",
    example: '9b3d7c6f-2a4e-4c1b-9f85-8a72e3d5b1c0',
  })
  @IsUUID()
  recieverId!: string;

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


}
