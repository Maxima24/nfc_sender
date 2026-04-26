import { Global, Module } from "@nestjs/common";
import { LoggerService } from "./logger.service";
import {WinstonModule} from "nest-winston"
import { winstonConfig } from "./winston.config";

@Global()
@Module({
    imports:[WinstonModule.forRoot(winstonConfig)],
    providers:[LoggerService],
    exports:[LoggerService]
})
export class LoggerModule{

}