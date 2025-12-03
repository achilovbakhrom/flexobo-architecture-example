export class GetTransportTypeByIdQuery {
  constructor(
    public readonly transportTypeId: string,
    public readonly language?: string
  ) {}
}

export class GetAllTransportTypesQuery {
  constructor(
    public readonly language?: string,
    public readonly options?: { limit?: number; offset?: number }
  ) {}
}

export class GetActiveTransportTypesQuery {
  constructor(
    public readonly language?: string,
    public readonly options?: { limit?: number; offset?: number }
  ) {}
}

export class SearchTransportTypesQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly language?: string,
    public readonly options?: { limit?: number; offset?: number }
  ) {}
}
