/**
 * Base class for Value Objects
 * Value objects have no identity and are defined by their attributes
 * Two value objects are equal if all their attributes are equal
 * Value objects are immutable
 */
export abstract class ValueObject {
  /**
   * Checks if this value object equals another value object
   * @param vo The value object to compare with
   */
  equals(vo?: ValueObject): boolean {
    if (!vo) {
      return false;
    }

    if (this === vo) {
      return true;
    }

    return this.isEqual(vo);
  }

  /**
   * Compares the attributes of this value object with another
   * Must be implemented by derived classes
   * @param vo The value object to compare with
   */
  protected abstract isEqual(vo: ValueObject): boolean;

  /**
   * Helper method to compare primitive properties
   * @param vo The value object to compare
   * @param props Properties to compare
   */
  protected compareProps<T extends ValueObject>(
    vo: T,
    ...props: string[]
  ): boolean {
    return props.every((prop) => {
      const thisValue = (this as Record<string, unknown>)[prop];
      const otherValue = (vo as Record<string, unknown>)[prop];
      return thisValue === otherValue;
    });
  }
}
