import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentCourier = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);