export const LOCATION_SERVICE = Symbol('LOCATION_SERVICE');

export interface LocationSuggestion {
  osmId: string;
  displayName: string;
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  type: 'city' | 'country' | 'region' | 'other';
}

export interface LocationResult {
  osmId: string;
  displayName: string;
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  type: 'city' | 'country' | 'region' | 'other';
  lat: number;
  lng: number;
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface SearchOptions {
  country?: string;
  type?: 'city' | 'country' | 'region';
  lang?: string;
  limit?: number;
}

export interface ILocationService {
  autocomplete(query: string, lang: string, limit: number): Promise<LocationSuggestion[]>;
  search(query: string, options: SearchOptions): Promise<LocationResult[]>;
  getByOsmId(osmId: string, lang: string): Promise<LocationResult | null>;
}
