import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class IGetAllNotification{ 
     @ApiPropertyOptional({ description: 'Page number' })
      @IsOptional()
      @IsNumber()
      @Type(() => Number)
      page?: number;
      @ApiPropertyOptional({ description: 'limit to filter transactions ' })
      @IsOptional()
      @IsNumber()
      @Type(() => Number)
      limit?: number;
}