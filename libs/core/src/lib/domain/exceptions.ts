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
