import * as winston from "winston"
import {utilities as nestWinstonUtilities} from 'nest-winston'
const isProd = process.env.NODE_ENV === "production"

export const winstonConfig:winston.LoggerOptions = {
    level:isProd? "info":"debug",
    format:isProd?winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack:true}),
        winston.format.json()
    ):winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({stack:true}),
        winston.format.colorize({all:true}),
        winston.format.timestamp({format:"YYYY-MM-DD HH:mm:ss"}),
        nestWinstonUtilities.format.nestLike("Quickbyte",{
            prettyPrint:true
        })
    ),
    transports:[new winston.transports.Console()],
    exitOnError:false
}