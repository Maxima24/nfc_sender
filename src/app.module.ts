import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpLoggerMiddleWare } from './common/middlewares/logger.middleware';
import { LoggerModule } from './logger/logger.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { UploadModule } from './modules/upload/upload.module';
import { JwtStrategy } from './common/utils/jwt.utils';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransferModule } from './modules/transfer/transfer.module';



@Module({
  imports: [
    BullModule.forRoot({
      connection:{
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT!) || 6379
      }
    }),
    LoggerModule,
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('THere is no jwt secret parsed in');
        }
        return {
          secret,
          signOptions: {
            expiresIn: '15d' as any,
          },
        };
      },
    }),
    PassportModule.register({
      defaultStrategy:"jwt"
    }),
    AuthModule,
    UploadModule,
    WalletModule,TransferModule
  ],
  providers: [PrismaService,JwtStrategy],
})
export class AppModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleWare).forRoutes("*")
  }
}
