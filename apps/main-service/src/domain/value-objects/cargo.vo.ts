export interface CargoData {
  name: string;
  weight: number;
  volume?: number;
  quantity?: number;
  packagingType?: string;
}

export class Cargo {
  constructor(
    public readonly name: string,
    public readonly weight: number,
    public readonly volume?: number,
    public readonly quantity?: number,
    public readonly packagingType?: string
  ) {}

  static create(data: CargoData): Cargo {
    return new Cargo(
      data.name,
      data.weight,
      data.volume,
      data.quantity,
      data.packagingType
    );
  }

  static fromJSON(json: CargoData): Cargo {
    return Cargo.create(json);
  }

  toJSON(): CargoData {
    return {
      name: this.name,
      weight: this.weight,
      volume: this.volume,
      quantity: this.quantity,
      packagingType: this.packagingType,
    };
  }
}
