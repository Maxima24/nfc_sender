import { ApiProperty } from "@nestjs/swagger"
import { Currency } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class WalletCreateDto{
    @ApiProperty({description:"The Users Id"})
    @IsString()
    userId!:string

     @ApiProperty({name:"UseriD",description:"The Users Id"})
    @IsEnum(Currency)
    currency!: Currency
}