import { createParamDecorator, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard, PassportStrategy } from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
   constructor( private readonly configService:ConfigService){

    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    })
   }
   async validate(payload: any) {
    // whatever you attach here becomes available as req.user
    return { userId: payload.sub, email: payload.email,role:payload.role };
  }

}
@Injectable()
export class JwtGuard extends AuthGuard('jwt'){

   canActivate(context:ExecutionContext){
    return super.canActivate(context)
   }
   handleRequest<TUser = any>(err: any, user: any, ): TUser {
     if(err || !user){
      throw new UnauthorizedException("Invalid User or missing token") 
     }
     return user
   }
}
