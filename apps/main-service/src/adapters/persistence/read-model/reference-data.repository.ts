import { Injectable, Inject } from '@nestjs/common';
import {
  IReferenceDataRepository,
  CountryDto,
  LanguageDto,
  CurrencyDto,
  ReferenceItemDto,
} from '../../../ports/reference-data.repository';

interface ReferenceDataPrismaClient {
  countryReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  languageReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  currencyReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  loadTypeReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  transportTypeReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  loadingTypeReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  aDRClassificationReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  permitReadModel: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any>;
  };
  companyTypeReadModel: {
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
  async findAllCountries(isActive?: boolean): Promise<CountryDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const countries = await this.prisma.countryReadModel.findMany({
      where,
      include: { translations: true },
    });
    return countries.map(this.mapCountry);
  }

  async findCountryByCode(code: string): Promise<CountryDto | null> {
    const country = await this.prisma.countryReadModel.findUnique({
      where: { code },
      include: { translations: true },
    });
    return country ? this.mapCountry(country) : null;
  }

  async findCountryById(id: string): Promise<CountryDto | null> {
    const country = await this.prisma.countryReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return country ? this.mapCountry(country) : null;
  }

  // Languages
  async findAllLanguages(isActive?: boolean): Promise<LanguageDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const languages = await this.prisma.languageReadModel.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return languages.map(this.mapLanguage);
  }

  async findLanguageByCode(code: string): Promise<LanguageDto | null> {
    const language = await this.prisma.languageReadModel.findUnique({
      where: { code },
    });
    return language ? this.mapLanguage(language) : null;
  }

  async findLanguageById(id: string): Promise<LanguageDto | null> {
    const language = await this.prisma.languageReadModel.findUnique({
      where: { id },
    });
    return language ? this.mapLanguage(language) : null;
  }

  // Currencies
  async findAllCurrencies(isActive?: boolean): Promise<CurrencyDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const currencies = await this.prisma.currencyReadModel.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { translations: true },
    });
    return currencies.map(this.mapCurrency);
  }

  async findCurrencyByCode(code: string): Promise<CurrencyDto | null> {
    const currency = await this.prisma.currencyReadModel.findUnique({
      where: { code },
      include: { translations: true },
    });
    return currency ? this.mapCurrency(currency) : null;
  }

  async findCurrencyById(id: string): Promise<CurrencyDto | null> {
    const currency = await this.prisma.currencyReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return currency ? this.mapCurrency(currency) : null;
  }

  // Load Types
  async findAllLoadTypes(isActive?: boolean): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.loadTypeReadModel.findMany({
      where,
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findLoadTypeById(id: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.loadTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Transport Types
  async findAllTransportTypes(isActive?: boolean): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.transportTypeReadModel.findMany({
      where,
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findTransportTypeById(id: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.transportTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Loading Types
  async findAllLoadingTypes(isActive?: boolean): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.loadingTypeReadModel.findMany({
      where,
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findLoadingTypeById(id: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.loadingTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // ADR Classifications
  async findAllADRClassifications(
    isActive?: boolean
  ): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.aDRClassificationReadModel.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findADRClassificationById(
    id: string
  ): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.aDRClassificationReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Permits
  async findAllPermits(isActive?: boolean): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.permitReadModel.findMany({
      where,
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findPermitById(id: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.permitReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  // Company Types
  async findAllCompanyTypes(isActive?: boolean): Promise<ReferenceItemDto[]> {
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const items = await this.prisma.companyTypeReadModel.findMany({
      where,
      include: { translations: true },
    });
    return items.map(this.mapReferenceItem);
  }

  async findCompanyTypeById(id: string): Promise<ReferenceItemDto | null> {
    const item = await this.prisma.companyTypeReadModel.findUnique({
      where: { id },
      include: { translations: true },
    });
    return item ? this.mapReferenceItem(item) : null;
  }

  private mapCountry(country: any): CountryDto {
    return {
      id: country.id,
      code: country.code,
      phoneCode: country.phoneCode,
      currencyCode: country.currencyCode,
      isActive: country.isActive,
      translations: country.translations?.map((t: any) => ({
        languageCode: t.languageCode,
        name: t.name,
      })),
    };
  }

  private mapLanguage(language: any): LanguageDto {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      isActive: language.isActive,
    };
  }

  private mapCurrency(currency: any): CurrencyDto {
    return {
      id: currency.id,
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
      isActive: currency.isActive,
      translations: currency.translations?.map((t: any) => ({
        languageCode: t.languageCode,
        name: t.name,
      })),
    };
  }

  private mapReferenceItem(item: any): ReferenceItemDto {
    return {
      id: item.id,
      isActive: item.isActive,
      translations: item.translations?.map((t: any) => ({
        languageCode: t.languageCode,
        name: t.name,
        description: t.description,
      })),
    };
  }
}
