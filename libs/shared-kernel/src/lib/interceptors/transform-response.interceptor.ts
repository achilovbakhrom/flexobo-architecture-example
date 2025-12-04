import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const RESPONSE_DTO_KEY = 'api_response_dto';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata =
      Reflect.getMetadata(RESPONSE_DTO_KEY, context.getHandler()) ??
      Reflect.getMetadata(RESPONSE_DTO_KEY, context.getClass());

    if (!metadata?.dto) {
      return next.handle();
    }

    const ResponseDto = metadata.dto;

    return next.handle().pipe(
      map((result) => {
        if (
          result &&
          typeof result === 'object' &&
          Object.prototype.hasOwnProperty.call(result, 'data')
        ) {
          return {
            ...(result as Record<string, unknown>),
            data: this.serializePayload(result.data, ResponseDto),
          };
        }

        return this.serializePayload(result, ResponseDto);
      })
    );
  }

  private serializePayload(
    payload: unknown,
    dto: new (...args: unknown[]) => unknown
  ) {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map((item) =>
        plainToInstance(dto, item, { excludeExtraneousValues: true })
      );
    }

    if (typeof payload === 'object') {
      return plainToInstance(dto, payload, { excludeExtraneousValues: true });
    }

    return payload;
  }
}
