import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import {Type} from "class-transformer"

export class WalletOperationDto{

    @ApiProperty({description:"User amount to increment"})
    @IsNumber()
    @Type(()=>Number)
    amount!:number
}

