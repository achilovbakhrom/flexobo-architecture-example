import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const LANGUAGE_HEADER = 'x-language-code';
const FALLBACK_LANGUAGE = 'en';

interface Translation {
  language_code?: string; // Transformed format
  languageCode?: string; // Raw Prisma format
  // you can extend this if needed:
  // [key: string]: unknown;
}

type MaybeWithTranslations = {
  translations?: Translation[];
  data?: unknown;
  [key: string]: unknown;
};

@Injectable()
export class LanguageFilterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const languageCode = request.headers[LANGUAGE_HEADER] as string | undefined;

    if (!languageCode) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const filtered = this.filterTranslations(data, languageCode);

        return filtered;
      })
    );
  }

  private filterTranslations<T>(data: T, languageCode: string): T {
    if (data == null) return data;

    // Arrays
    if (Array.isArray(data)) {
      return data.map((item) =>
        this.filterTranslations(item, languageCode)
      ) as unknown as T;
    }

    // Non-object primitives
    if (typeof data !== 'object') {
      return data;
    }

    const obj = data as MaybeWithTranslations;
    let changed = false;
    const result: MaybeWithTranslations = { ...obj };

    // Handle translations array
    if (Array.isArray(obj.translations)) {
      const matching =
        obj.translations.find(
          (t) =>
            t.language_code === languageCode || t.languageCode === languageCode
        ) ??
        obj.translations.find(
          (t) =>
            t.language_code === FALLBACK_LANGUAGE ||
            t.languageCode === FALLBACK_LANGUAGE
        );

      if (matching) {
        result.translations = [matching];
        changed = true;
      }
    }

    // Recursively handle `data` field if exists
    if (obj.data !== undefined) {
      const newData = this.filterTranslations(obj.data, languageCode);
      if (newData !== obj.data) {
        result.data = newData;
        changed = true;
      }
    }

    // If nothing changed – return original reference (micro-optimization)
    return (changed ? result : obj) as unknown as T;
  }
}
