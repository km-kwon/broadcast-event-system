/**
 * Event payload structure
 */
export type EventPayload<T = unknown> = {
  type: string;
  data: T;
};

/**
 * Event listener callback type
 */
export type EventListener<T = unknown> = (payload: EventPayload<T>) => void;

/**
 * Event service interface
 */
export interface IEventService {
  /**
   * Emit an event with data
   */
  emit<T>(eventType: string, data: T): void;

  /**
   * Subscribe to an event
   */
  on<T>(eventType: string, listener: EventListener<T>): void;

  /**
   * Unsubscribe from an event
   */
  off<T>(eventType: string, listener: EventListener<T>): void;

  /**
   * Clear all listeners for a specific event type
   */
  clear(eventType: string): void;

  /**
   * Clear all listeners for all events
   */
  clearAll(): void;
}

/**
 * Broadcast service interface
 */
export interface IBroadcastService {
  /**
   * Subscribe to a broadcast channel
   * @returns Listener ID that can be used to unsubscribe
   */
  subscribe(channelName: string, callback: (data: any) => void): string;

  /**
   * Unsubscribe a specific listener from a broadcast channel
   */
  unsubscribe(channelName: string, listenerId: string): void;

  /**
   * Broadcast data to a channel
   */
  broadcast(channelName: string, data?: any): void;

  /**
   * Close a specific channel
   */
  close(channelName: string): void;

  /**
   * Close all channels
   */
  closeAll(): void;
}
