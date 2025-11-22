import { ValueObject } from '@flexobo/core';

export enum WeightUnit {
  KG = 'kg',
  LB = 'lb',
}

export interface WeightProps {
  value: number;
  unit: WeightUnit;
}

/**
 * Weight value object
 * Represents weight with unit conversion capabilities
 */
export class Weight extends ValueObject {
  private readonly props: WeightProps;

  private static readonly KG_TO_LB = 2.20462;
  private static readonly LB_TO_KG = 0.453592;

  private constructor(props: WeightProps) {
    super();
    this.props = props;
  }

  /**
   * Creates a new Weight value object
   * @param value The weight value
   * @param unit The unit of measurement
   */
  static create(value: number, unit: WeightUnit = WeightUnit.KG): Weight {
    if (value < 0) {
      throw new Error('Weight cannot be negative');
    }

    return new Weight({ value, unit });
  }

  get value(): number {
    return this.props.value;
  }

  get unit(): WeightUnit {
    return this.props.unit;
  }

  /**
   * Converts weight to kilograms
   */
  toKilograms(): Weight {
    if (this.props.unit === WeightUnit.KG) {
      return this;
    }

    return Weight.create(this.props.value * Weight.LB_TO_KG, WeightUnit.KG);
  }

  /**
   * Converts weight to pounds
   */
  toPounds(): Weight {
    if (this.props.unit === WeightUnit.LB) {
      return this;
    }

    return Weight.create(this.props.value * Weight.KG_TO_LB, WeightUnit.LB);
  }

  /**
   * Gets the weight value in kilograms
   */
  getValueInKg(): number {
    if (this.props.unit === WeightUnit.KG) {
      return this.props.value;
    }
    return this.props.value * Weight.LB_TO_KG;
  }

  /**
   * Gets the weight value in pounds
   */
  getValueInLb(): number {
    if (this.props.unit === WeightUnit.LB) {
      return this.props.value;
    }
    return this.props.value * Weight.KG_TO_LB;
  }

  /**
   * Adds two weights (automatically handles conversion)
   */
  add(other: Weight): Weight {
    const thisInKg = this.getValueInKg();
    const otherInKg = other.getValueInKg();
    return Weight.create(thisInKg + otherInKg, WeightUnit.KG);
  }

  /**
   * Subtracts a weight (automatically handles conversion)
   */
  subtract(other: Weight): Weight {
    const thisInKg = this.getValueInKg();
    const otherInKg = other.getValueInKg();
    return Weight.create(thisInKg - otherInKg, WeightUnit.KG);
  }

  /**
   * Checks if this weight is greater than another
   */
  isGreaterThan(other: Weight): boolean {
    return this.getValueInKg() > other.getValueInKg();
  }

  /**
   * Checks if this weight is less than another
   */
  isLessThan(other: Weight): boolean {
    return this.getValueInKg() < other.getValueInKg();
  }

  /**
   * Formats the weight as a string
   */
  format(): string {
    return `${this.props.value.toFixed(2)} ${this.props.unit}`;
  }

  protected isEqual(vo: ValueObject): boolean {
    if (!(vo instanceof Weight)) {
      return false;
    }

    // Compare in kg for equality
    return Math.abs(this.getValueInKg() - vo.getValueInKg()) < 0.001;
  }

  /**
   * Converts to plain object
   */
  toJSON(): WeightProps {
    return { ...this.props };
  }
}
