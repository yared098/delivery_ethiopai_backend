import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
