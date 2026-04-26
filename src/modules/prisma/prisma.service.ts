import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {Pool} from "pg"
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit,OnModuleDestroy{
  
  constructor(private readonly configService:ConfigService){
    const pool =  new Pool({
      connectionString:configService.get("DATABASE_URL")!
    })
    const adapter = new PrismaPg(pool)
    super({
      adapter
    })  
  }
  async onModuleInit() {
    await this.$connect()
  }
  async onModuleDestroy() {
    await this.$disconnect()
  }
  async checkHealth(){
    const start = Date.now()
    try{
      await this.$queryRaw`SELECT 1;`;
      return {
        service:"Prisma",
        status:"up",
        message:"Prisma is up",
        duration: Date.now()
      }

  }catch(e){
      return {
        message:"Prisma",
        status:"Down",
        duration: Date.now()
      }
  }


}
}
