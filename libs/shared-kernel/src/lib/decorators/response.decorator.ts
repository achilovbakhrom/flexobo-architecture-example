import { ApiPropertyOptions } from '@nestjs/swagger';
import { withBaseResponse } from '../utils/base-response';

const RESPONSE_DTO_KEY = 'api_response_dto';

type Constructor<T = object> = new (...args: unknown[]) => T;
type DecoratorReturn = void | Constructor | TypedPropertyDescriptor<unknown>;

export function ResponseDTO<TDto extends Constructor>(
  dto: TDto,
  options?: ApiPropertyOptions
): MethodDecorator & ClassDecorator {
  const decorator = (
    target: object,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<unknown>
  ): DecoratorReturn => {
    const swaggerDto = withBaseResponse(dto, options);

    if (descriptor && descriptor.value) {
      Reflect.defineMetadata(
        'swagger/apiResponse',
        {
          default: {
            type: swaggerDto,
          },
        },
        descriptor.value
      );

      Reflect.defineMetadata(RESPONSE_DTO_KEY, { dto }, descriptor.value);

      return descriptor;
    }

    Reflect.defineMetadata(
      'swagger/apiResponse',
      {
        default: {
          type: swaggerDto,
        },
      },
      target
    );

    Reflect.defineMetadata(RESPONSE_DTO_KEY, { dto }, target);

    return target as Constructor;
  };

  return decorator as MethodDecorator & ClassDecorator;
}
