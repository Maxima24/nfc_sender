import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, Min } from "class-validator";

export class SquadTopUpDto{


    @ApiProperty({description:"Amount to topup"})
    @IsNumber()
    @IsPositive()
    @Min(100)
    amount!:number

}