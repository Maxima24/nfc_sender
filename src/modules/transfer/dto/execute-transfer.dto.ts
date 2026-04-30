import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ExecuteTransferDto{    
    @ApiProperty({ description: 'Token for transfer i.e the signed jwt for the transfer tag' })
    @IsString()
    token!:string
}