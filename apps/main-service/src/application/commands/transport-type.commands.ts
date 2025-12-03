import { TransportTypeTranslationData } from '../../domain/events/transport-type.events';

export class CreateTransportTypeCommand {
  constructor(
    public readonly data: {
      isActive?: boolean;
      translations: TransportTypeTranslationData[];
    }
  ) {}
}

export class UpdateTransportTypeCommand {
  constructor(
    public readonly transportTypeId: string,
    public readonly data: {
      isActive?: boolean;
    }
  ) {}
}

export class ActivateTransportTypeCommand {
  constructor(public readonly transportTypeId: string) {}
}

export class DeactivateTransportTypeCommand {
  constructor(public readonly transportTypeId: string) {}
}

export class AddTransportTypeTranslationCommand {
  constructor(
    public readonly transportTypeId: string,
    public readonly translation: TransportTypeTranslationData
  ) {}
}

export class UpdateTransportTypeTranslationCommand {
  constructor(
    public readonly transportTypeId: string,
    public readonly translation: TransportTypeTranslationData
  ) {}
}

export class DeleteTransportTypeTranslationCommand {
  constructor(
    public readonly transportTypeId: string,
    public readonly language: string
  ) {}
}

export class DeleteTransportTypeCommand {
  constructor(public readonly transportTypeId: string) {}
}
