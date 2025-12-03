import { BillingCycle } from '../constants/enums';

export class BillingPeriod {
  constructor(
    public readonly start: Date,
    public readonly end: Date,
    public readonly cycle: BillingCycle
  ) {}

  static createMonthly(startDate: Date = new Date()): BillingPeriod {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    return new BillingPeriod(start, end, BillingCycle.MONTHLY);
  }

  static createYearly(startDate: Date = new Date()): BillingPeriod {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    return new BillingPeriod(start, end, BillingCycle.YEARLY);
  }

  static create(
    startDate: Date,
    cycle: BillingCycle = BillingCycle.MONTHLY
  ): BillingPeriod {
    return cycle === BillingCycle.YEARLY
      ? BillingPeriod.createYearly(startDate)
      : BillingPeriod.createMonthly(startDate);
  }

  next(): BillingPeriod {
    return BillingPeriod.create(this.end, this.cycle);
  }

  isActive(date: Date = new Date()): boolean {
    return date >= this.start && date < this.end;
  }

  isExpired(date: Date = new Date()): boolean {
    return date >= this.end;
  }

  getDaysRemaining(date: Date = new Date()): number {
    if (this.isExpired(date)) return 0;
    const diff = this.end.getTime() - date.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDurationInDays(): number {
    const diff = this.end.getTime() - this.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
      cycle: this.cycle,
    };
  }
}
