export interface PriceData {
  amount: number;
  currency: string;
}

export class Price {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  static create(data: PriceData): Price {
    return new Price(data.amount, data.currency);
  }

  static fromJSON(json: PriceData): Price {
    return Price.create(json);
  }

  toJSON(): PriceData {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  equals(other: Price): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isGreaterThan(other: Price): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare prices with different currencies');
    }
    return this.amount > other.amount;
  }

  isLessThan(other: Price): boolean {
    if (this.currency !== other.currency) {
      throw new Error('Cannot compare prices with different currencies');
    }
    return this.amount < other.amount;
  }
}
