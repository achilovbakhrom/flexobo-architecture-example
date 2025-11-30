/**
 * Service Registry Implementation
 *
 * Manages service registration and provides service lookup.
 * Follows Single Responsibility Principle - only handles service management.
 * Implements IServiceRegistry interface for Dependency Inversion.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IServiceRegistry,
  ServiceDefinition,
  ServiceRegistryEvent,
} from '../interfaces';

@Injectable()
export class ServiceRegistry implements IServiceRegistry {
  private readonly logger = new Logger(ServiceRegistry.name);
  private readonly services = new Map<string, ServiceDefinition>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Register a new service
   */
  register(service: ServiceDefinition): void {
    const normalizedService = this.normalizeService(service);

    if (this.services.has(normalizedService.name)) {
      this.logger.warn(
        `Service '${normalizedService.name}' already registered, updating...`
      );
    }

    this.services.set(normalizedService.name, normalizedService);
    this.logger.log(
      `Registered service: ${normalizedService.name} -> ${normalizedService.baseUrl}`
    );

    this.emitEvent({
      type: 'SERVICE_REGISTERED',
      service: normalizedService,
    });
  }

  /**
   * Unregister a service by name
   */
  unregister(name: string): boolean {
    const deleted = this.services.delete(name);

    if (deleted) {
      this.logger.log(`Unregistered service: ${name}`);
      this.emitEvent({
        type: 'SERVICE_UNREGISTERED',
        serviceName: name,
      });
    }

    return deleted;
  }

  /**
   * Get service by name
   */
  getService(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered services
   */
  getAllServices(): ServiceDefinition[] {
    return Array.from(this.services.values()).filter(
      (s) => s.enabled !== false
    );
  }

  /**
   * Check if service exists
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Update service configuration
   */
  updateService(name: string, updates: Partial<ServiceDefinition>): boolean {
    const existing = this.services.get(name);

    if (!existing) {
      this.logger.warn(`Cannot update non-existent service: ${name}`);
      return false;
    }

    const updated = this.normalizeService({
      ...existing,
      ...updates,
      name, // Prevent name change
    });

    this.services.set(name, updated);
    this.logger.log(`Updated service: ${name}`);

    this.emitEvent({
      type: 'SERVICE_UPDATED',
      service: updated,
    });

    return true;
  }

  /**
   * Bulk register services
   */
  registerMany(services: ServiceDefinition[]): void {
    for (const service of services) {
      this.register(service);
    }
  }

  /**
   * Get service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services
   */
  clear(): void {
    const names = this.getServiceNames();
    this.services.clear();
    this.logger.log('Cleared all registered services');

    for (const name of names) {
      this.emitEvent({
        type: 'SERVICE_UNREGISTERED',
        serviceName: name,
      });
    }
  }

  /**
   * Normalize service definition with defaults
   */
  private normalizeService(service: ServiceDefinition): ServiceDefinition {
    return {
      ...service,
      baseUrl: service.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      enabled: service.enabled ?? true,
      timeout: service.timeout ?? 5000,
      healthCheckPath: service.healthCheckPath ?? '/health',
      retry: service.retry ?? {
        attempts: 3,
        delay: 1000,
        backoffMultiplier: 2,
      },
    };
  }

  /**
   * Emit service registry event
   */
  private emitEvent(event: ServiceRegistryEvent): void {
    this.eventEmitter.emit('service.registry', event);
  }
}
