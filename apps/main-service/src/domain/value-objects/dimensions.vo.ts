export interface DimensionsData {
  lengthM?: number;
  widthM?: number;
  heightM?: number;
}

export class Dimensions {
  constructor(
    public readonly lengthM?: number,
    public readonly widthM?: number,
    public readonly heightM?: number
  ) {}

  static create(data: DimensionsData): Dimensions {
    return new Dimensions(data.lengthM, data.widthM, data.heightM);
  }

  static fromJSON(json: DimensionsData): Dimensions {
    return Dimensions.create(json);
  }

  toJSON(): DimensionsData {
    return {
      lengthM: this.lengthM,
      widthM: this.widthM,
      heightM: this.heightM,
    };
  }

  getVolumeM3(): number | undefined {
    if (
      this.lengthM !== undefined &&
      this.widthM !== undefined &&
      this.heightM !== undefined
    ) {
      return this.lengthM * this.widthM * this.heightM;
    }
    return undefined;
  }
}
