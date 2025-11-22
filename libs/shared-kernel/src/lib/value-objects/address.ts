import { ValueObject } from '@flexobo/core';

export interface AddressProps {
  street: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
}

/**
 * Address value object
 * Represents a physical address with validation
 */
export class Address extends ValueObject {
  private readonly props: AddressProps;

  private constructor(props: AddressProps) {
    super();
    this.props = props;
  }

  /**
   * Creates a new Address
   * @param props Address properties
   */
  static create(props: AddressProps): Address {
    // Validation
    if (!props.street || props.street.trim().length === 0) {
      throw new Error('Street is required');
    }
    if (!props.city || props.city.trim().length === 0) {
      throw new Error('City is required');
    }
    if (!props.country || props.country.trim().length === 0) {
      throw new Error('Country is required');
    }

    return new Address({
      street: props.street.trim(),
      city: props.city.trim(),
      state: props.state?.trim(),
      country: props.country.trim(),
      zipCode: props.zipCode?.trim(),
    });
  }

  get street(): string {
    return this.props.street;
  }

  get city(): string {
    return this.props.city;
  }

  get state(): string | undefined {
    return this.props.state;
  }

  get country(): string {
    return this.props.country;
  }

  get zipCode(): string | undefined {
    return this.props.zipCode;
  }

  /**
   * Formats the address as a string
   */
  format(): string {
    const parts = [
      this.props.street,
      this.props.city,
      this.props.state,
      this.props.zipCode,
      this.props.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Calculates distance to another address (simplified - in real app would use geolocation)
   * @param other The other address
   */
  distanceTo(other: Address): number {
    // Simplified: same city = 0, same country = 100, different country = 1000
    if (this.city === other.city) {
      return 0;
    }
    if (this.country === other.country) {
      return 100;
    }
    return 1000;
  }

  protected isEqual(vo: ValueObject): boolean {
    if (!(vo instanceof Address)) {
      return false;
    }

    return (
      this.props.street === vo.props.street &&
      this.props.city === vo.props.city &&
      this.props.state === vo.props.state &&
      this.props.country === vo.props.country &&
      this.props.zipCode === vo.props.zipCode
    );
  }

  /**
   * Converts to plain object
   */
  toJSON(): AddressProps {
    return { ...this.props };
  }
}
