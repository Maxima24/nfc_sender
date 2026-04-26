import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "src/modules/prisma/prisma.service";

@Injectable()
export class KycGuard implements CanActivate{
    constructor(
        private readonly db:PrismaService
    ){}

    async canActivate(context: ExecutionContext):Promise<boolean>{
        const request = context.switchToHttp().getRequest()
        if(!request.user){
            throw new ForbiddenException("User does not exist")
        }
        const userId =request.user.id
        const sellerProfile =await this.db.sellerProfile.findUnique({
            where:{userId}
        })
        if(!sellerProfile){
            throw new ForbiddenException("You must complete KYC Verification before performing this action")
        }
        return true
    }
}