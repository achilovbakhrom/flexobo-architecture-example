import { Controller, Inject, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import {
  IReferenceDataRepository,
  REFERENCE_DATA_REPOSITORY,
} from '../../ports/reference-data.repository';

interface GetCountryRequest {
  country_id: string;
  language_code?: string;
}

interface CountryInfo {
  id: string;
  code: string;
  name: string;
  phone_code: string;
  currency_code: string;
  is_active: boolean;
}

interface GetCountryResponse {
  found: boolean;
  country?: CountryInfo;
}

@Controller()
export class ReferenceDataGrpcController {
  private readonly logger = new Logger(ReferenceDataGrpcController.name);

  constructor(
    @Inject(REFERENCE_DATA_REPOSITORY)
    private readonly referenceDataRepo: IReferenceDataRepository
  ) {}

  @GrpcMethod('ReferenceDataService', 'GetCountry')
  async getCountry(data: GetCountryRequest): Promise<GetCountryResponse> {
    try {
      const country = await this.referenceDataRepo.findCountryById(
        data.country_id
      );

      if (!country) {
        this.logger.debug(`Country not found: ${data.country_id}`);
        return { found: false };
      }

      // Get translation for requested language or first available
      const languageCode = data.language_code || 'en';
      const translation =
        country.translations?.find((t) => t.languageCode === languageCode) ||
        country.translations?.[0];

      const response = {
        found: true,
        country: {
          id: country.id,
          code: country.code,
          name: translation?.name || '',
          phone_code: country.phoneCode || '',
          currency_code: country.currencyCode || '',
          is_active: country.isActive,
        },
      };

      return response;
    } catch (error) {
      this.logger.error(
        `Error in getCountry for ID ${data.country_id}:`,
        error instanceof Error ? error.stack : error
      );
      throw new RpcException({
        code: 2,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
