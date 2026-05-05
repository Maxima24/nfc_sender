import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ExternalToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Get from config or request header
    return request.headers['x-external-token'] || process.env.EXTERNAL_API_TOKEN;
  },
);