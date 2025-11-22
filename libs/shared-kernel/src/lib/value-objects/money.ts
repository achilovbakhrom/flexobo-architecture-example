import { ValueObject } from '@flexobo/core';

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export interface MoneyProps {
  amount: number;
  currency: Currency;
}

/**
 * Money value object
 * Represents monetary value with currency
 */
export class Money extends ValueObject {
  private readonly props: MoneyProps;

  private constructor(props: MoneyProps) {
    super();
    this.props = props;
  }

  /**
   * Creates a new Money value object
   * @param amount The monetary amount
   * @param currency The currency
   */
  static create(amount: number, currency: Currency = Currency.USD): Money {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    // Round to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;

    return new Money({ amount: roundedAmount, currency });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  /**
   * Adds two money values (must be same currency)
   */
  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add money with different currencies');
    }

    return Money.create(
      this.props.amount + other.props.amount,
      this.props.currency
    );
  }

  /**
   * Subtracts money value (must be same currency)
   */
  subtract(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot subtract money with different currencies');
    }

    return Money.create(
      this.props.amount - other.props.amount,
      this.props.currency
    );
  }

  /**
   * Multiplies money by a factor
   */
  multiply(factor: number): Money {
    return Money.create(this.props.amount * factor, this.props.currency);
  }

  /**
   * Divides money by a divisor
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }

    return Money.create(this.props.amount / divisor, this.props.currency);
  }

  /**
   * Checks if this money is greater than another
   */
  isGreaterThan(other: Money): boolean {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot compare money with different currencies');
    }

    return this.props.amount > other.props.amount;
  }

  /**
   * Checks if this money is less than another
   */
  isLessThan(other: Money): boolean {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot compare money with different currencies');
    }

    return this.props.amount < other.props.amount;
  }

  /**
   * Formats the money as a string
   */
  format(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.props.currency,
    });

    return formatter.format(this.props.amount);
  }

  protected isEqual(vo: ValueObject): boolean {
    if (!(vo instanceof Money)) {
      return false;
    }

    return (
      this.props.amount === vo.props.amount &&
      this.props.currency === vo.props.currency
    );
  }

  /**
   * Converts to plain object
   */
  toJSON(): MoneyProps {
    return { ...this.props };
  }
}
