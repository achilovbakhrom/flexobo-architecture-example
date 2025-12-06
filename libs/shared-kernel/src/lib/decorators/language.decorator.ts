import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

type LanguageAwareRequest = Request & { language?: string };

export const Language = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<LanguageAwareRequest>();
    return request.language;
  },
);
