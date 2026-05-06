import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class ISearchRecipientDto{

    @ApiProperty({description:"phone number of reciepient"})
    @IsNumber()
    phone!:number
}