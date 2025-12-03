import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract language code from x-language-code header
 * Usage: @Language() language: string
 */
export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-language-code'] as string | undefined;
  }
);
