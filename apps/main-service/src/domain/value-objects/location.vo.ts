export interface LocationData {
  country: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export class Location {
  constructor(
    public readonly country: string,
    public readonly city: string,
    public readonly address?: string,
    public readonly lat?: number,
    public readonly lng?: number
  ) {}

  static create(data: LocationData): Location {
    return new Location(
      data.country,
      data.city,
      data.address,
      data.lat,
      data.lng
    );
  }

  static fromJSON(json: LocationData): Location {
    return Location.create(json);
  }

  toJSON(): LocationData {
    return {
      country: this.country,
      city: this.city,
      address: this.address,
      lat: this.lat,
      lng: this.lng,
    };
  }

  equals(other: Location): boolean {
    return (
      this.country === other.country &&
      this.city === other.city &&
      this.address === other.address &&
      this.lat === other.lat &&
      this.lng === other.lng
    );
  }
}
