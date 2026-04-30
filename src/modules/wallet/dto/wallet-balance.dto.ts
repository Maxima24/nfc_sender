import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";


export class GetWalletBalanceDto{

    @ApiProperty({description:"User id"})
    @IsString()
    userId!:string
}