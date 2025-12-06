import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrencyCode = createParamDecorator(
  (defaultValue = 'USD', ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    const header_currency = request.headers['x-currency-code'];

    if (header_currency && typeof header_currency === 'string') {
      return header_currency.toUpperCase();
    }
    return defaultValue;
  }
);
