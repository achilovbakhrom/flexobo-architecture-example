import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILocationService,
  LocationSuggestion,
  LocationResult,
  SearchOptions,
} from '../../ports/location.service';

interface NominatimResponse {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    region?: string;
  };
  boundingbox?: string[];
}

@Injectable()
export class OsmLocationService implements ILocationService {
  private readonly logger = new Logger(OsmLocationService.name);
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get('NOMINATIM_URL', 'https://nominatim.openstreetmap.org');
    this.userAgent = this.configService.get('NOMINATIM_USER_AGENT', 'Flexobo/1.0');
  }

  async autocomplete(
    query: string,
    lang: string,
    limit: number
  ): Promise<LocationSuggestion[]> {
    try {
      const url = new URL('/search', this.baseUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('accept-language', lang);
      // Focus on cities, towns, and countries
      url.searchParams.set('featuretype', 'city');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        this.logger.error(`Nominatim API error: ${response.status}`);
        return [];
      }

      const data: NominatimResponse[] = await response.json();

      return data.map((item) => this.toLocationSuggestion(item));
    } catch (error) {
      this.logger.error('Failed to fetch autocomplete suggestions', error);
      return [];
    }
  }

  async search(query: string, options: SearchOptions): Promise<LocationResult[]> {
    try {
      const url = new URL('/search', this.baseUrl);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(options.limit || 20));
      url.searchParams.set('accept-language', options.lang || 'en');

      if (options.country) {
        url.searchParams.set('countrycodes', options.country.toLowerCase());
      }

      if (options.type) {
        const typeMap: Record<string, string> = {
          city: 'city',
          country: 'country',
          region: 'state',
        };
        url.searchParams.set('featuretype', typeMap[options.type] || 'city');
      }

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        this.logger.error(`Nominatim API error: ${response.status}`);
        return [];
      }

      const data: NominatimResponse[] = await response.json();

      return data.map((item) => this.toLocationResult(item));
    } catch (error) {
      this.logger.error('Failed to search locations', error);
      return [];
    }
  }

  async getByOsmId(osmId: string, lang: string): Promise<LocationResult | null> {
    try {
      // OSM ID format: N123456, W123456, R123456 (Node, Way, Relation)
      const osmType = osmId.charAt(0).toUpperCase();
      const osmIdNumber = osmId.substring(1);

      const typeMap: Record<string, string> = {
        N: 'N',
        W: 'W',
        R: 'R',
      };

      if (!typeMap[osmType]) {
        this.logger.warn(`Invalid OSM ID format: ${osmId}`);
        return null;
      }

      const url = new URL('/lookup', this.baseUrl);
      url.searchParams.set('osm_ids', `${osmType}${osmIdNumber}`);
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', lang);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        this.logger.error(`Nominatim API error: ${response.status}`);
        return null;
      }

      const data: NominatimResponse[] = await response.json();

      if (data.length === 0) {
        return null;
      }

      return this.toLocationResult(data[0]);
    } catch (error) {
      this.logger.error('Failed to get location by OSM ID', error);
      return null;
    }
  }

  private toLocationSuggestion(item: NominatimResponse): LocationSuggestion {
    const city = item.address?.city || item.address?.town || item.address?.village;

    return {
      osmId: `${item.osm_type?.charAt(0).toUpperCase() || 'N'}${item.osm_id}`,
      displayName: item.display_name,
      country: item.address?.country || '',
      countryCode: item.address?.country_code?.toUpperCase() || '',
      city,
      region: item.address?.state || item.address?.region,
      type: this.mapLocationType(item.type, item.class),
    };
  }

  private toLocationResult(item: NominatimResponse): LocationResult {
    const city = item.address?.city || item.address?.town || item.address?.village;

    return {
      osmId: `${item.osm_type?.charAt(0).toUpperCase() || 'N'}${item.osm_id}`,
      displayName: item.display_name,
      country: item.address?.country || '',
      countryCode: item.address?.country_code?.toUpperCase() || '',
      city,
      region: item.address?.state || item.address?.region,
      type: this.mapLocationType(item.type, item.class),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      boundingBox: item.boundingbox
        ? {
            south: parseFloat(item.boundingbox[0]),
            north: parseFloat(item.boundingbox[1]),
            west: parseFloat(item.boundingbox[2]),
            east: parseFloat(item.boundingbox[3]),
          }
        : undefined,
    };
  }

  private mapLocationType(type: string, osmClass: string): 'city' | 'country' | 'region' | 'other' {
    if (type === 'country' || osmClass === 'boundary') {
      return 'country';
    }
    if (['city', 'town', 'village', 'municipality'].includes(type)) {
      return 'city';
    }
    if (['state', 'region', 'province', 'county'].includes(type)) {
      return 'region';
    }
    return 'other';
  }
}
