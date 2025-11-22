import { ValueObject } from '@flexobo/core';
import { Address } from './address';

export interface DistanceProps {
  value: number;
  unit: 'km' | 'miles';
}

/**
 * Distance value object
 * Represents distance with calculation capabilities
 */
export class Distance extends ValueObject {
  private readonly props: DistanceProps;

  private static readonly KM_TO_MILES = 0.621371;
  private static readonly MILES_TO_KM = 1.60934;

  private constructor(props: DistanceProps) {
    super();
    this.props = props;
  }

  /**
   * Creates a new Distance value object
   * @param value The distance value
   * @param unit The unit of measurement
   */
  static create(value: number, unit: 'km' | 'miles' = 'km'): Distance {
    if (value < 0) {
      throw new Error('Distance cannot be negative');
    }

    return new Distance({ value, unit });
  }

  get value(): number {
    return this.props.value;
  }

  get unit(): 'km' | 'miles' {
    return this.props.unit;
  }

  /**
   * Converts distance to kilometers
   */
  toKilometers(): Distance {
    if (this.props.unit === 'km') {
      return this;
    }

    return Distance.create(this.props.value * Distance.MILES_TO_KM, 'km');
  }

  /**
   * Converts distance to miles
   */
  toMiles(): Distance {
    if (this.props.unit === 'miles') {
      return this;
    }

    return Distance.create(this.props.value * Distance.KM_TO_MILES, 'miles');
  }

  /**
   * Calculates distance between two addresses (simplified)
   * In a real application, this would use geolocation APIs
   * @param from Starting address
   * @param to Destination address
   */
  static calculateBetween(from: Address, to: Address): Distance {
    // Simplified calculation - in reality would use lat/long
    const simpleDistance = from.distanceTo(to);
    return Distance.create(simpleDistance, 'km');
  }

  /**
   * Adds two distances (automatically handles conversion)
   */
  add(other: Distance): Distance {
    const thisInKm =
      this.props.unit === 'km'
        ? this.props.value
        : this.props.value * Distance.MILES_TO_KM;

    const otherInKm =
      other.props.unit === 'km'
        ? other.props.value
        : other.props.value * Distance.MILES_TO_KM;

    return Distance.create(thisInKm + otherInKm, 'km');
  }

  /**
   * Checks if this distance is greater than another
   */
  isGreaterThan(other: Distance): boolean {
    const thisKm = this.toKilometers().value;
    const otherKm = other.toKilometers().value;
    return thisKm > otherKm;
  }

  /**
   * Formats the distance as a string
   */
  format(): string {
    return `${this.props.value.toFixed(2)} ${this.props.unit}`;
  }

  protected isEqual(vo: ValueObject): boolean {
    if (!(vo instanceof Distance)) {
      return false;
    }

    // Compare in km for equality
    const thisKm = this.toKilometers().value;
    const otherKm = vo.toKilometers().value;
    return Math.abs(thisKm - otherKm) < 0.001;
  }

  /**
   * Converts to plain object
   */
  toJSON(): DistanceProps {
    return { ...this.props };
  }
}
