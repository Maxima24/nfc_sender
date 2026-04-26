import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody:true
  });
  const logger = app.get(LoggerService);
  app.useLogger(logger);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  const config = new DocumentBuilder()
    .setTitle('Qbyte Api docs')
    .setDescription('APi Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  // in main.ts, before app.listen
app.getHttpAdapter().get('/', (req, res) => {
  res.json({ status: 'ok' });
});
await app.listen(process.env.PORT ?? 8080, '0.0.0.0');}
bootstrap();
