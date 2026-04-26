import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
@Injectable()
export class LoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}
  log(message: string, context?: string, meta?: Record<string,any>) {
    this.logger.info(message, { context, ...meta });
  }
  error(message:string,context:string,trace?:string,meta?:Record<string,any>){
    this.logger.error(message,{trace,context,...meta})
  }
  warn(message:string,context:string,meta?:Record<string,any>){
    this.logger.warn(message,{context,...meta})
  }
  debug(message:string,context:string,meta?:Record<string,any>){
            this.logger.debug(message,{message,context,...meta})
  }
  logAuthEvent(event:string,userId:string,meta?:Record<string,any>){
    this.logger.info(`Auth:${event}`,{
        context:"auth",
        userId,
        ...meta
    })
  }
  logOrderEvent(event:string,userId:String,orderId:string,meta?:Record<string,any>){
    this.logger.info(`Order ${event}`,{
        context:"Orders",
        userId,
        orderId,
        ...meta
    })
  }
  logJobEvent(jobName:string,status:"started" |"completed" | "failed" ,meta?:Record<string,any>){
    const level = status ==="failed"? "error": "info"
    this.logger.log(level ,`Job ${status}: ${jobName} `,{
        context:'BullMQ',
        status,
        ...meta
    })
  }


}