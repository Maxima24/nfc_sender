import { ApiProperty } from "@nestjs/swagger"
import { Currency } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class WalletCreateDto{
    @ApiProperty({description:"The Users Id"})
    @IsString()
    userId!:string

     @ApiProperty({name:"currency",description:"The Users Id",examples:[Currency.NGN]})
    @IsEnum(Currency)
    currency!: Currency
}