export interface PlanLimitsData {
  loadsPerMonth: number; // -1 for unlimited
  tripsPerMonth: number;
  bidsPerMonth: number;
  teamMembers: number;
  storageGb: number;
  apiRequestsPerDay: number;
}

export class PlanLimits {
  constructor(private readonly limits: PlanLimitsData) {}

  static create(data: Partial<PlanLimitsData>): PlanLimits {
    return new PlanLimits({
      loadsPerMonth: data.loadsPerMonth ?? 10,
      tripsPerMonth: data.tripsPerMonth ?? 10,
      bidsPerMonth: data.bidsPerMonth ?? 50,
      teamMembers: data.teamMembers ?? 1,
      storageGb: data.storageGb ?? 1,
      apiRequestsPerDay: data.apiRequestsPerDay ?? 100,
    });
  }

  static unlimited(): PlanLimits {
    return new PlanLimits({
      loadsPerMonth: -1,
      tripsPerMonth: -1,
      bidsPerMonth: -1,
      teamMembers: -1,
      storageGb: -1,
      apiRequestsPerDay: -1,
    });
  }

  isWithinLimit(usageType: string, currentUsage: number): boolean {
    const limit = this.getLimit(usageType);
    return limit === -1 || currentUsage < limit;
  }

  getLimit(usageType: string): number {
    const mapping: Record<string, keyof PlanLimitsData> = {
      LOAD_CREATED: 'loadsPerMonth',
      TRIP_POSTED: 'tripsPerMonth',
      BID_PLACED: 'bidsPerMonth',
      TEAM_MEMBER_ADDED: 'teamMembers',
    };
    const key = mapping[usageType];
    return key ? this.limits[key] : -1;
  }

  getRemainingUsage(usageType: string, currentUsage: number): number {
    const limit = this.getLimit(usageType);
    if (limit === -1) return -1; // unlimited
    return Math.max(0, limit - currentUsage);
  }

  isUnlimited(usageType: string): boolean {
    return this.getLimit(usageType) === -1;
  }

  get loadsPerMonth(): number {
    return this.limits.loadsPerMonth;
  }

  get tripsPerMonth(): number {
    return this.limits.tripsPerMonth;
  }

  get bidsPerMonth(): number {
    return this.limits.bidsPerMonth;
  }

  get teamMembers(): number {
    return this.limits.teamMembers;
  }

  get storageGb(): number {
    return this.limits.storageGb;
  }

  get apiRequestsPerDay(): number {
    return this.limits.apiRequestsPerDay;
  }

  toJSON(): PlanLimitsData {
    return { ...this.limits };
  }
}
