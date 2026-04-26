import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class RefreshTokenDto{

    @IsString()
    @ApiProperty({
         description:"User refresh token",
         example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN0ZWVsbWF4aW04MEBnbWFpbC5jb20iLCJpZCI6IjQ2OWI2ZGNkLTBjZTAtNGFiYi1hZjU3LTMwYjhlNTk0OGNmYSIsInJvbGUiOiJCVVlFUiIsImlhdCI6MTc3Njc5MTI1NSwiZXhwIjoxNzc4MDg3MjU1fQ.zdtxwn3LSHqtqSEUFMSLb2ohVfTGPhXoqgTnwVdH49E"
    })
    refreshToken!:string
}