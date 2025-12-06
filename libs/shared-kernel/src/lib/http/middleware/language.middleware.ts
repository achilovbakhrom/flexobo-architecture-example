import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'uz'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ru';

export interface RequestWithLanguage extends Request {
  language: SupportedLanguage;
}

/**
 * Middleware to detect and set user's preferred language
 * Priority:
 * 1. X-Language header
 * 2. Accept-Language header
 * 3. Query parameter ?lang=
 * 4. User profile language (if authenticated)
 * 5. Default language
 */
@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: RequestWithLanguage, res: Response, next: NextFunction): void {
    const language = this.detectLanguage(req);
    req.language = language;

    // Set response header for client reference
    res.setHeader('Content-Language', language);

    next();
  }

  private detectLanguage(req: RequestWithLanguage): SupportedLanguage {
    // 1. Check X-Language header
    const xLanguage = req.headers['x-language'];
    if (xLanguage && this.isValidLanguage(xLanguage as string)) {
      return xLanguage as SupportedLanguage;
    }

    // 2. Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const parsed = this.parseAcceptLanguage(acceptLanguage);
      if (parsed) {
        return parsed;
      }
    }

    // 3. Check query parameter
    const queryLang = req.query['lang'];
    if (queryLang && this.isValidLanguage(queryLang as string)) {
      return queryLang as SupportedLanguage;
    }

    // 4. Check user profile (if authenticated)
    const user = (req as unknown as { user?: { language?: string } }).user;
    if (user?.language && this.isValidLanguage(user.language)) {
      return user.language as SupportedLanguage;
    }

    // 5. Default
    return DEFAULT_LANGUAGE;
  }

  private isValidLanguage(lang: string): boolean {
    return SUPPORTED_LANGUAGES.includes(lang.toLowerCase() as SupportedLanguage);
  }

  private parseAcceptLanguage(header: string): SupportedLanguage | null {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ru;q=0.8")
    const parts = header.split(',');

    for (const part of parts) {
      const [langTag] = part.trim().split(';');
      const lang = langTag.split('-')[0].toLowerCase();

      if (this.isValidLanguage(lang)) {
        return lang as SupportedLanguage;
      }
    }

    return null;
  }
}

/**
 * Helper function to get language from request
 */
export function getLanguage(req: Request): SupportedLanguage {
  return (req as RequestWithLanguage).language || DEFAULT_LANGUAGE;
}
