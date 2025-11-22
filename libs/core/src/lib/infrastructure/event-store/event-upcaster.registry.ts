import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  IEventUpcaster,
  EVENT_UPCASTER_METADATA,
} from './event-upcaster.interface';

/**
 * Registry for event upcasters that handles automatic chaining
 * of multiple upcasters to transform events from old versions
 * to the latest version.
 *
 * The registry builds a directed graph of version transformations
 * and finds the shortest path from source to target version.
 *
 * @example
 * ```typescript
 * // Register upcasters
 * registry.register(userRegisteredV1ToV2);
 * registry.register(userRegisteredV2ToV3);
 *
 * // Upcast event from v1 to v3 (automatically chains v1→v2→v3)
 * const upcastedEvent = registry.upcast('UserRegistered', eventV1, 3);
 * ```
 */
@Injectable()
export class EventUpcasterRegistry implements OnModuleInit {
  private readonly logger = new Logger(EventUpcasterRegistry.name);
  private readonly upcasters = new Map<string, Map<number, IEventUpcaster>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Automatically discover and register all upcasters decorated with @EventUpcaster
   */
  async onModuleInit() {
    // Auto-discovery is handled by providing upcasters explicitly in the module
    // This method is kept for future enhancement or can be removed
    this.logger.log('EventUpcasterRegistry initialized');
  }

  /**
   * Register an event upcaster
   */
  register(upcaster: IEventUpcaster): void {
    if (!this.upcasters.has(upcaster.eventType)) {
      this.upcasters.set(upcaster.eventType, new Map());
    }

    const eventUpcasters = this.upcasters.get(upcaster.eventType)!;

    if (eventUpcasters.has(upcaster.fromVersion)) {
      this.logger.warn(
        `Overwriting upcaster for ${upcaster.eventType} from version ${upcaster.fromVersion}`
      );
    }

    eventUpcasters.set(upcaster.fromVersion, upcaster);

    this.logger.log(
      `Registered upcaster: ${upcaster.eventType} v${upcaster.fromVersion} → v${upcaster.toVersion}`
    );
  }

  /**
   * Upcast an event to the target version.
   * Automatically chains multiple upcasters if necessary.
   *
   * @param eventType The type of event to upcast
   * @param event The event to upcast
   * @param targetVersion The desired version
   * @returns The upcasted event
   * @throws Error if no upcasting path exists
   */
  upcast(eventType: string, event: any, targetVersion: number): any {
    const currentVersion = event.eventVersion || 1;

    if (currentVersion === targetVersion) {
      return event;
    }

    if (currentVersion > targetVersion) {
      throw new Error(
        `Cannot downcast event ${eventType} from version ${currentVersion} to ${targetVersion}`
      );
    }

    const eventUpcasters = this.upcasters.get(eventType);
    if (!eventUpcasters || eventUpcasters.size === 0) {
      throw new Error(`No upcasters registered for event type ${eventType}`);
    }

    // Find path from current version to target version
    const path = this.findUpcastPath(eventType, currentVersion, targetVersion);

    if (path.length === 0) {
      throw new Error(
        `No upcasting path found for ${eventType} from version ${currentVersion} to ${targetVersion}`
      );
    }

    // Apply upcasters in sequence
    let upcastedEvent = event;
    for (const upcaster of path) {
      upcastedEvent = upcaster.upcast(upcastedEvent);
      this.logger.debug(
        `Upcasted ${eventType} from v${upcaster.fromVersion} to v${upcaster.toVersion}`
      );
    }

    return upcastedEvent;
  }

  /**
   * Upcast multiple events to their target versions
   */
  upcastMany(eventType: string, events: any[], targetVersion: number): any[] {
    return events.map((event) => this.upcast(eventType, event, targetVersion));
  }

  /**
   * Get the latest version for an event type
   */
  getLatestVersion(eventType: string): number {
    const eventUpcasters = this.upcasters.get(eventType);
    if (!eventUpcasters || eventUpcasters.size === 0) {
      return 1; // Default to version 1 if no upcasters exist
    }

    let maxVersion = 1;
    for (const upcaster of eventUpcasters.values()) {
      if (upcaster.toVersion > maxVersion) {
        maxVersion = upcaster.toVersion;
      }
    }

    return maxVersion;
  }

  /**
   * Check if an upcasting path exists between two versions
   */
  hasUpcastPath(
    eventType: string,
    fromVersion: number,
    toVersion: number
  ): boolean {
    if (fromVersion === toVersion) {
      return true;
    }

    const eventUpcasters = this.upcasters.get(eventType);
    if (!eventUpcasters || eventUpcasters.size === 0) {
      return false;
    }

    try {
      const path = this.findUpcastPath(eventType, fromVersion, toVersion);
      return path.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Find the shortest path of upcasters from source to target version
   * using breadth-first search
   */
  private findUpcastPath(
    eventType: string,
    fromVersion: number,
    toVersion: number
  ): IEventUpcaster[] {
    const eventUpcasters = this.upcasters.get(eventType)!;

    // BFS to find shortest path
    const queue: Array<{ version: number; path: IEventUpcaster[] }> = [
      { version: fromVersion, path: [] },
    ];
    const visited = new Set<number>([fromVersion]);

    while (queue.length > 0) {
      const { version, path } = queue.shift()!;

      if (version === toVersion) {
        return path;
      }

      const upcaster = eventUpcasters.get(version);
      if (upcaster && !visited.has(upcaster.toVersion)) {
        visited.add(upcaster.toVersion);
        queue.push({
          version: upcaster.toVersion,
          path: [...path, upcaster],
        });
      }
    }

    return []; // No path found
  }

  /**
   * Type guard to check if an object is an IEventUpcaster
   */
  private isEventUpcaster(obj: any): obj is IEventUpcaster {
    return (
      typeof obj.eventType === 'string' &&
      typeof obj.fromVersion === 'number' &&
      typeof obj.toVersion === 'number' &&
      typeof obj.upcast === 'function'
    );
  }

  /**
   * Get all registered upcasters for debugging
   */
  getAllUpcasters(): Map<string, Map<number, IEventUpcaster>> {
    return new Map(this.upcasters);
  }

  /**
   * Clear all registered upcasters (useful for testing)
   */
  clear(): void {
    this.upcasters.clear();
  }
}
