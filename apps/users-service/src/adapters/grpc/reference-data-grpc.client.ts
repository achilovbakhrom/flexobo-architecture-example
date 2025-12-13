import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { CountryData } from '../../ports/reference-data';

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

interface ReferenceDataGrpcService {
  getCountry(data: GetCountryRequest): Observable<GetCountryResponse>;
}

@Injectable()
export class ReferenceDataGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataGrpcClient.name);
  private grpcService!: ReferenceDataGrpcService;

  constructor(
    @Inject('REFERENCE_DATA_GRPC_CLIENT') private readonly client: ClientGrpc
  ) {}

  onModuleInit() {
    this.grpcService = this.client.getService<ReferenceDataGrpcService>(
      'ReferenceDataService'
    );
    this.logger.log('Reference Data gRPC Client initialized');
  }

  async getCountryById(
    countryId: string,
    languageCode = 'en'
  ): Promise<CountryData | null> {
    try {
      const response = await lastValueFrom(
        this.grpcService.getCountry({
          country_id: countryId,
          language_code: languageCode,
        })
      );

      if (!response.found || !response.country) {
        return null;
      }

      return {
        id: response.country.id,
        code: response.country.code,
        name: response.country.name,
      };
    } catch (error) {
      this.logger.error(
        `gRPC error fetching country ${countryId}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }
}
