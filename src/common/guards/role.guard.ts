import { CanActivate, ExecutionContext,  Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { Observable } from "rxjs";

@Injectable()
export class RoleGuard implements CanActivate{
    constructor (private reflector:Reflector){}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles',[
            context.getHandler(),
            context.getClass()
        ])
        if(!requiredRoles) return true
        const {user} = context.switchToHttp().getRequest()
        return requiredRoles.includes(user.role)
    }
}