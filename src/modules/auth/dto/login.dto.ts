import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ 
    example: "+2348012345678", 
    description: "Phone number used to login" 
  })
  @IsString()
  @MinLength(14)
  @IsOptional()
  phoneNumber?: string;


  @ApiProperty({
    example:"steelmaxima21@gmail.com",
    description:"Enter a valid email"
  })
  @IsEmail()
  @IsOptional()
  email?:string

  @ApiProperty({ 
    example: "strongpassword", 
    description: "Password (minimum 6 characters)" 
  })
  @IsString()
  @MinLength(6)
  password!: string;
}