import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeviceTokenDto{
  @ApiProperty({
    description: "User ID",
    example: "e73c3056-5bfb-4ae6-9ec7-95f14ae4e182"
  })
  @IsString()
  userId!: string

  @ApiProperty({
    description: "Device token for push notifications",
    example: "fcm-device-token-12345"
  })
  @IsString()
  deviceToken!: string
}