export const REFERENCE_DATA_REPOSITORY = Symbol('REFERENCE_DATA_REPOSITORY');

export interface TranslationDto {
  languageCode: string;
  name: string;
  description?: string;
}

export interface CountryDto {
  id: string;
  code: string;
  phoneCode: string;
  currencyCode?: string;
  isActive: boolean;
  translations?: TranslationDto[];
}

export interface LanguageDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CurrencyDto {
  id: string;
  code: string;
  symbol: string;
  rate: number;
  isActive: boolean;
  translations?: TranslationDto[];
}

export interface ReferenceItemDto {
  id: string;
  code: string;
  isActive: boolean;
  translations?: TranslationDto[];
}

export interface IReferenceDataRepository {
  // Countries
  findAllCountries(): Promise<CountryDto[]>;
  findCountryByCode(code: string): Promise<CountryDto | null>;
  findCountryById(id: string): Promise<CountryDto | null>;

  // Languages
  findAllLanguages(): Promise<LanguageDto[]>;
  findLanguageByCode(code: string): Promise<LanguageDto | null>;
  findLanguageById(id: string): Promise<LanguageDto | null>;

  // Currencies
  findAllCurrencies(): Promise<CurrencyDto[]>;
  findCurrencyByCode(code: string): Promise<CurrencyDto | null>;
  findCurrencyById(id: string): Promise<CurrencyDto | null>;

  // Load Types
  findAllLoadTypes(): Promise<ReferenceItemDto[]>;
  findLoadTypeByCode(code: string): Promise<ReferenceItemDto | null>;
  findLoadTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Transport Types
  findAllTransportTypes(): Promise<ReferenceItemDto[]>;
  findTransportTypeByCode(code: string): Promise<ReferenceItemDto | null>;
  findTransportTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Loading Types
  findAllLoadingTypes(): Promise<ReferenceItemDto[]>;
  findLoadingTypeByCode(code: string): Promise<ReferenceItemDto | null>;
  findLoadingTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Company Types
  findAllCompanyTypes(): Promise<ReferenceItemDto[]>;
  findCompanyTypeByCode(code: string): Promise<ReferenceItemDto | null>;
  findCompanyTypeById(id: string): Promise<ReferenceItemDto | null>;

  // ADR Classifications
  findAllADRClassifications(): Promise<ReferenceItemDto[]>;
  findADRClassificationByCode(code: string): Promise<ReferenceItemDto | null>;
  findADRClassificationById(id: string): Promise<ReferenceItemDto | null>;

  // Permits
  findAllPermits(): Promise<ReferenceItemDto[]>;
  findPermitByCode(code: string): Promise<ReferenceItemDto | null>;
  findPermitById(id: string): Promise<ReferenceItemDto | null>;
}
