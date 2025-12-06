import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const SUPPORTED_CURRENCIES = ['USD', 'UZS', 'RUB', 'EUR', 'KZT'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export const CURRENCY_CONVERTER = Symbol('CURRENCY_CONVERTER');

/**
 * Interface for currency conversion service
 */
export interface ICurrencyConverter {
  getRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number>;
  convert(amount: number, from: SupportedCurrency, to: SupportedCurrency): Promise<number>;
}

export interface PriceField {
  amount: number;
  currency: SupportedCurrency;
}

export interface RequestWithCurrency {
  targetCurrency?: SupportedCurrency;
  user?: { currency?: string };
  headers?: { 'x-currency'?: string };
  query?: { currency?: string };
}

/**
 * Interceptor to handle currency conversion in responses
 * Detects target currency from:
 * 1. X-Currency header
 * 2. Query parameter ?currency=
 * 3. User profile currency
 * 4. Default currency
 */
@Injectable()
export class CurrencyInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject(CURRENCY_CONVERTER)
    private readonly currencyConverter?: ICurrencyConverter
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithCurrency>();
    const response = context.switchToHttp().getResponse();

    const targetCurrency = this.detectCurrency(request);
    request.targetCurrency = targetCurrency;

    // Set response header
    response.setHeader('X-Currency', targetCurrency);

    if (!this.currencyConverter) {
      return next.handle();
    }

    return next.handle().pipe(
      map(async (data) => {
        if (!data) return data;
        return this.convertPricesInResponse(data, targetCurrency);
      }),
      // Flatten the promise
      map((data) => (data instanceof Promise ? data : Promise.resolve(data))),
      map((promise) => promise)
    );
  }

  private detectCurrency(request: RequestWithCurrency): SupportedCurrency {
    // 1. Check X-Currency header
    const xCurrency = request.headers?.['x-currency'];
    if (xCurrency && this.isValidCurrency(xCurrency)) {
      return xCurrency as SupportedCurrency;
    }

    // 2. Check query parameter
    const queryCurrency = request.query?.currency;
    if (queryCurrency && this.isValidCurrency(queryCurrency)) {
      return queryCurrency as SupportedCurrency;
    }

    // 3. Check user profile
    const userCurrency = request.user?.currency;
    if (userCurrency && this.isValidCurrency(userCurrency)) {
      return userCurrency as SupportedCurrency;
    }

    // 4. Default
    return DEFAULT_CURRENCY;
  }

  private isValidCurrency(currency: string): boolean {
    return SUPPORTED_CURRENCIES.includes(currency.toUpperCase() as SupportedCurrency);
  }

  private async convertPricesInResponse(
    data: unknown,
    targetCurrency: SupportedCurrency
  ): Promise<unknown> {
    if (!data || !this.currencyConverter) return data;

    if (Array.isArray(data)) {
      return Promise.all(
        data.map((item) => this.convertPricesInObject(item, targetCurrency))
      );
    }

    return this.convertPricesInObject(data, targetCurrency);
  }

  private async convertPricesInObject(
    obj: unknown,
    targetCurrency: SupportedCurrency
  ): Promise<unknown> {
    if (!obj || typeof obj !== 'object' || !this.currencyConverter) {
      return obj;
    }

    const result = { ...obj } as Record<string, unknown>;

    // Look for price fields and convert them
    const priceFieldNames = ['price', 'amount', 'total', 'cost', 'fee', 'value'];

    for (const fieldName of priceFieldNames) {
      if (fieldName in result && `${fieldName}Currency` in result) {
        const amount = result[fieldName] as number;
        const currency = result[`${fieldName}Currency`] as SupportedCurrency;

        if (currency && currency !== targetCurrency && typeof amount === 'number') {
          result[fieldName] = await this.currencyConverter.convert(
            amount,
            currency,
            targetCurrency
          );
          result[`${fieldName}Currency`] = targetCurrency;
          result[`${fieldName}Original`] = { amount, currency };
        }
      }
    }

    // Handle nested objects
    for (const key of Object.keys(result)) {
      const value = result[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = await this.convertPricesInObject(value, targetCurrency);
      } else if (Array.isArray(value)) {
        result[key] = await Promise.all(
          value.map((item) =>
            typeof item === 'object'
              ? this.convertPricesInObject(item, targetCurrency)
              : item
          )
        );
      }
    }

    return result;
  }
}

/**
 * Helper to get target currency from request
 */
export function getTargetCurrency(request: RequestWithCurrency): SupportedCurrency {
  return request.targetCurrency || DEFAULT_CURRENCY;
}
