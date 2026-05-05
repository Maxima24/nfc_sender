import { createParamDecorator, ExecutionContext } from "@nestjs/common"

export const CurrentUser = createParamDecorator(
    (data:unknown,ctx:ExecutionContext)=>{
        const req =ctx.switchToHttp().getRequest()
                console.log(req.user.id)
                console.log(req.user.userId,"This is the user id")
        return req.user 
    }
)