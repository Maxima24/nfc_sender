import {  IsString, MinLength, } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"



export class SignupDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  name!: string

  @ApiProperty({ example: "john@example.com" })
  @IsString()
  email!: string

  @ApiProperty({ example: "strongpassword" })
  @IsString()
  @MinLength(6)
  password!: string
}