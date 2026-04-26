import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';
@Injectable()
export class HttpLoggerMiddleWare implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}
  use(req: Request, res: Response, next: NextFunction) {
    const {method,originalUrl} = req
    const startTime = Date.now()
    const userId = (req as any).user?.id
      res.on('finish',()=>{
        const {statusCode} = res
        const duration = Date.now() - startTime
        this.logger.log(`${method} ${originalUrl} ${statusCode}- ${duration}ms`,"HTTP",{
            method,url:originalUrl,statusCode,duration,userId
        }) 

      })
       next() 
  }
}
