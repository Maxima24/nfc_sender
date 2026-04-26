import { IsBoolean, IsString, IsOptional, MinLength, ValidateNested } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"

class SellerProfileDto {
  @ApiPropertyOptional({ example: "My Store" })
  @IsOptional()
  @IsString()
  storeName!: string

  @ApiPropertyOptional({ example: "We sell cool stuff" })
  @IsOptional()
  @IsString()
  description!: string

}

export class BuyerSignupDto {
  @ApiProperty({ example: "John Doe" })
  @IsString()
  name!: string

  @ApiProperty({ example: "john@example.com" })
  @IsString()
  email!: string

  @ApiProperty({ example: "+2348012345678" })
  @IsString()
  phoneNumber!: string

  @ApiProperty({ example: "strongpassword" })
  @IsString()
  @MinLength(6)
  password!: string

  @ApiPropertyOptional({ type: SellerProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SellerProfileDto)
  sellerProfile?: SellerProfileDto

  @ApiPropertyOptional()
  @IsString()
  deviceToken!: string
}