import { BadRequestException, Body, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, Bucket$ } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from 'src/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import {v4 as uuidv4} from "uuid"

@Injectable()
export class UploadService {
  private readonly uploader: S3Client;

  constructor(
    private db: PrismaService,
    private readonly logger: LoggerService,
    private configService: ConfigService,
  ) {
    const r2_endpoint = this.configService.get<string>('R2_ENDPOINT');
    const r2_access_id = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const r2_secret_key = this.configService.get<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    console.log('R2_ENDPOINT:', r2_endpoint);
console.log('R2_ACCESS_ID:', r2_access_id);
console.log('R2_SECRET_KEY:', r2_secret_key);
    const secrets = { r2_endpoint, r2_access_id, r2_secret_key };
    Object.entries(secrets).forEach(([key, value]) => {
      if (!value || value.trim() === '') {
        throw new BadRequestException(`Missing required env variable: ${key}`);
      }
    });

    this.uploader = new S3Client({
      region: 'auto',
      endpoint: r2_endpoint as string,
      credentials: {
        accessKeyId: r2_access_id as string,
        secretAccessKey: r2_secret_key as string,
      },
    });
  }


  public async uploadImage(fileBuffer:Buffer,mimeType:string,originalName:string){
    const ext = originalName.split(".").pop()   
    const key = `${uuidv4()}.${ext}`
    await this.uploader.send(
        new PutObjectCommand({
            Bucket: this.configService.get<string>("R2_BUCKET_NAME") as string,
            Key:key,
            Body:fileBuffer,
            ContentType: mimeType
        })
    )
    return `${this.configService.get<string>("R2_PUBlIC_URL")}/${key}`
  }


}
