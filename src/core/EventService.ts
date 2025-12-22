import type { EventListener, EventPayload, IEventService } from '../types/events';

/**
 * Pure TypeScript implementation of an event bus
 * Supports type-safe event emission and subscription
 */
export class EventService implements IEventService {
  private listeners: Map<string, Set<EventListener<any>>> = new Map();

  /**
   * Emit an event to all registered listeners
   * @param eventType - The type of event to emit
   * @param data - The data to send with the event
   */
  emit<T>(eventType: string, data: T): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const payload: EventPayload<T> = { type: eventType, data };
      eventListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for "${eventType}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event
   * @param eventType - The type of event to listen for
   * @param listener - The callback function to execute when the event is emitted
   */
  on<T>(eventType: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener as EventListener<any>);
  }

  /**
   * Unsubscribe from an event
   * @param eventType - The type of event to stop listening for
   * @param listener - The callback function to remove
   */
  off<T>(eventType: string, listener: EventListener<T>): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener<any>);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Clear all listeners for a specific event type
   * @param eventType - The type of event to clear listeners for
   */
  clear(eventType: string): void {
    this.listeners.delete(eventType);
  }

  /**
   * Clear all listeners for all events
   */
  clearAll(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event type
   * @param eventType - The type of event to check
   * @returns The number of listeners registered for the event
   */
  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  /**
   * Get all registered event types
   * @returns An array of all event types that have listeners
   */
  eventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }
}

/**
 * Singleton instance of EventService
 * Use this for a shared event bus across your application
 */
export const eventService = new EventService();
