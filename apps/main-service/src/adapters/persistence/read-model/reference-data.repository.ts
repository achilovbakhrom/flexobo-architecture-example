import { Injectable, Inject } from '@nestjs/common';
import {
  IReferenceDataRepository,
  CountryDto,
  LanguageDto,
  CurrencyDto,
  ReferenceItemDto,
} from '../../../ports/reference-data.repository';

interface ReferenceDataPrismaClient {
  country: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  language: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  currency: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  loadType: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  transportType: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  loadingType: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  companyType: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  aDRClassification: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  permit: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaReferenceDataRepository implements IReferenceDataRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: ReferenceDataPrismaClient
  ) {}

  // Countries
  async findAllCountries(): Promise<CountryDto[]> {
    const countries = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return countries.map(this.mapCountry);
  }

  async findCountryByCode(code: string): Promise<CountryDto | null> {
    const country = await this.prisma.country.findUnique({
      where: { code },
    });
    return country ? this.mapCountry(country) : null;
  }

  // Languages
  async findAllLanguages(): Promise<LanguageDto[]> {
    const languages = await this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return languages.map(this.mapLanguage);
  }

  async findLanguageByCode(code: string): Promise<LanguageDto | null> {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });
    return language ? this.mapLanguage(language) : null;
  }

  // Currencies
  async findAllCurrencies(): Promise<CurrencyDto[]> {
    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return currencies.map(this.mapCurrency);
  }

  async findCurrencyByCode(code: string): Promise<CurrencyDto | null> {
    const currency = await this.prisma.currency.findUnique({
      where: { code },
    });
    return currency ? this.mapCurrency(currency) : null;
  }

  // Load Types
  async findAllLoadTypes(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.loadType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findLoadTypeByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.loadType.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Transport Types
  async findAllTransportTypes(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.transportType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findTransportTypeByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.transportType.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Loading Types
  async findAllLoadingTypes(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.loadingType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findLoadingTypeByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.loadingType.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Company Types
  async findAllCompanyTypes(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.companyType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findCompanyTypeByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.companyType.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // ADR Classifications
  async findAllADRClassifications(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.aDRClassification.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findADRClassificationByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.aDRClassification.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Permits
  async findAllPermits(): Promise<ReferenceItemDto[]> {
    const items = await this.prisma.permit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return items.map(this.mapReferenceItem);
  }

  async findPermitByCode(code: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.permit.findUnique({
      where: { code },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  private mapCountry(country: any): CountryDto {
    return {
      id: country.id,
      code: country.code,
      name: country.name,
      nameRu: country.nameRu,
      nameUz: country.nameUz,
      phoneCode: country.phoneCode,
      isActive: country.isActive,
    };
  }

  private mapLanguage(language: any): LanguageDto {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      isActive: language.isActive,
    };
  }

  private mapCurrency(currency: any): CurrencyDto {
    return {
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      rate: currency.rate,
      isActive: currency.isActive,
    };
  }

  private mapReferenceItem(item: any): ReferenceItemDto {
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      nameRu: item.nameRu,
      nameUz: item.nameUz,
      description: item.description,
      isActive: item.isActive,
    };
  }
}
