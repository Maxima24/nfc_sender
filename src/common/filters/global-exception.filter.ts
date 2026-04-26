import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { LoggerService } from "src/logger/logger.service";

export class GlobalExceptionFilter implements ExceptionFilter {

    constructor(private readonly logger:LoggerService){}

    catch(exception:unknown,host:ArgumentsHost){
        const ctx = host.switchToHttp()
        const response  = ctx.getResponse<Response>()
        const request =ctx.getRequest<Request>()

        const statusCode = exception instanceof HttpException ? exception.getStatus(): HttpStatus.INTERNAL_SERVER_ERROR
        const message = exception instanceof HttpException ?this.extractMessage(exception): "Internal Server error"
        const stack  = exception instanceof Error ? exception.stack: undefined

        if(statusCode >= 500){
            this.logger.error(message,"ExceptionFilter",stack,{
                method: request.method,
                statusCode,
                url:request.url,
                userId: (request as any).user?.id
            })
        }else{
            this.logger.warn(message,"ExceptionFilter",{
                method:request.method,
                url:request.url,
                statusCode,
            })
        }
        response.status(statusCode).json({
            statusCode,
            message,
            timeStamp: new Date().toISOString(),
            path:request.url

        })
    }
    private extractMessage(exception:HttpException){
        const response = exception.getResponse()
        if(typeof response === "string") return response
        if(typeof response === "object" && "message" in response)  {
            const msg = (response as any).message
            return Array.isArray(msg) ? msg.join(", "):msg
        }   
        return response
    }
}
