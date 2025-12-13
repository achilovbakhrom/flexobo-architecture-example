export const REFERENCE_DATA_SERVICE = Symbol('REFERENCE_DATA_SERVICE');

export interface CountryData {
  id: string;
  code: string;
  name: string;
}

export interface IReferenceDataService {
  getCountryById(countryId: string, languageCode?: string): Promise<CountryData | null>;
}
