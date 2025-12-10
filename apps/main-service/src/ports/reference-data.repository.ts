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
  code?: string;
  isActive: boolean;
  translations?: TranslationDto[];
}

export interface IReferenceDataRepository {
  // Countries
  findAllCountries(isActive?: boolean): Promise<CountryDto[]>;
  findCountryByCode(code: string): Promise<CountryDto | null>;
  findCountryById(id: string): Promise<CountryDto | null>;

  // Languages
  findAllLanguages(isActive?: boolean): Promise<LanguageDto[]>;
  findLanguageByCode(code: string): Promise<LanguageDto | null>;
  findLanguageById(id: string): Promise<LanguageDto | null>;

  // Currencies
  findAllCurrencies(isActive?: boolean): Promise<CurrencyDto[]>;
  findCurrencyByCode(code: string): Promise<CurrencyDto | null>;
  findCurrencyById(id: string): Promise<CurrencyDto | null>;

  // Load Types
  findAllLoadTypes(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findLoadTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Transport Types
  findAllTransportTypes(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findTransportTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Loading Types
  findAllLoadingTypes(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findLoadingTypeById(id: string): Promise<ReferenceItemDto | null>;

  // Company Types
  findAllCompanyTypes(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findCompanyTypeById(id: string): Promise<ReferenceItemDto | null>;

  // ADR Classifications
  findAllADRClassifications(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findADRClassificationById(id: string): Promise<ReferenceItemDto | null>;

  // Permits
  findAllPermits(isActive?: boolean): Promise<ReferenceItemDto[]>;
  findPermitById(id: string): Promise<ReferenceItemDto | null>;
}
