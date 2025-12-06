/**
 * Base class for all domain exceptions
 */
export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a validation fails in the domain
 */
export class ValidationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when a requested entity is not found
 */
export class NotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id "${id}" not found`);
  }
}

/**
 * Thrown when a concurrency conflict occurs
 * For example, when trying to update an aggregate with a stale version
 */
export class ConcurrencyException extends DomainException {
  constructor(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number
  ) {
    super(
      `Concurrency conflict for aggregate "${aggregateId}". Expected version ${expectedVersion}, but actual version is ${actualVersion}`
    );
  }
}

/**
 * Thrown when an unauthorized action is attempted
 */
export class UnauthorizedException extends DomainException {
  constructor(message = 'Unauthorized') {
    super(message);
  }
}

/**
 * Thrown when a forbidden action is attempted
 */
export class ForbiddenException extends DomainException {
  constructor(message = 'Forbidden') {
    super(message);
  }
}

/**
 * Thrown when a business rule is violated
 */
export class BusinessRuleViolationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

export class AggregateRootNotFoundException extends DomainException {
  constructor(aggregateType: string, aggregateId: string) {
    super(
      `Aggregate root of type "${aggregateType}" with id "${aggregateId}" not found`
    );
  }
}

/**
 * Base class for projection-related exceptions
 */
export abstract class ProjectionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an event version doesn't match expected sequence
 * This indicates events arrived out of order and should be retried
 */
export class EventVersionMismatchException extends ProjectionException {
  public readonly aggregateId: string;
  public readonly expectedVersion: number;
  public readonly actualVersion: number;
  public readonly eventVersion: number;

  constructor(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
    eventVersion: number
  ) {
    super(
      `Version mismatch for aggregate "${aggregateId}". ` +
        `Read model version: ${actualVersion}, event version: ${eventVersion}, ` +
        `expected read model version: ${expectedVersion}`
    );
    this.aggregateId = aggregateId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
    this.eventVersion = eventVersion;
  }
}

/**
 * Thrown when an event has already been applied (idempotency check)
 * This is not an error - the event should be acknowledged and skipped
 */
export class EventAlreadyAppliedException extends ProjectionException {
  public readonly aggregateId: string;
  public readonly eventVersion: number;
  public readonly currentVersion: number;

  constructor(aggregateId: string, eventVersion: number, currentVersion: number) {
    super(
      `Event already applied for aggregate "${aggregateId}". ` +
        `Event version: ${eventVersion}, current version: ${currentVersion}`
    );
    this.aggregateId = aggregateId;
    this.eventVersion = eventVersion;
    this.currentVersion = currentVersion;
  }
}
