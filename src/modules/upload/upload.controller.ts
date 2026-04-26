import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image to Cloudflare R2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (jpeg, png, webp)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      example: {
        message: 'Image Uploaded Successfully',
        data: {
          imageUrl: 'https://pub-hash.r2.dev/uuid.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'No file provided or invalid file' })
  @ApiResponse({ status: 500, description: 'Upload to R2 failed' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = await this.uploadService.uploadImage(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return {
      message: 'Image Uploaded Successfully',
      data: { imageUrl },
    };
  }
}