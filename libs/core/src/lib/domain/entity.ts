/**
 * Base class for Entities
 * Entities have a unique identity and can change over time
 * Two entities are equal if they have the same identity
 */
export abstract class Entity<T = string> {
  protected readonly _id: T;

  constructor(id: T) {
    this._id = id;
  }

  /**
   * Gets the entity's unique identifier
   */
  get id(): T {
    return this._id;
  }

  /**
   * Checks if this entity equals another entity
   * Entities are equal if they have the same identity
   * @param entity The entity to compare with
   */
  equals(entity?: Entity<T>): boolean {
    if (!entity) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id === entity._id;
  }
}
