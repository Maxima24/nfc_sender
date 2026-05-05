import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class IniateTopUp{
    @ApiProperty({description:"Amount to topup"})
    @IsNumber()
    @Min(10)
    amount!:number
}