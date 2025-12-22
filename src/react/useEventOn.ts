import { useEffect } from 'react';
import type { EventPayload } from '../types/events';
import { eventService } from '../core/EventService';

/**
 * Hook to subscribe to an event
 * Automatically unsubscribes when the component unmounts
 * @param eventType - The event type to listen for
 * @param callback - Function to call when the event is emitted
 * @param service - Optional custom event service instance (defaults to singleton)
 * @example
 * ```tsx
 * type CounterEvent = { count: number };
 *
 * function MyComponent() {
 *   useEventOn<CounterEvent>('counter', (data) => {
 *     console.log(`Counter changed: ${data.count}`);
 *   });
 *
 *   return <div>Listening to counter events</div>;
 * }
 * ```
 */
export function useEventOn<T = unknown>(
  eventType: string,
  callback: (data: T) => void,
  service = eventService
) {
  useEffect(() => {
    const listener = (payload: EventPayload<T>) => {
      if (payload.type === eventType) {
        callback(payload.data);
      }
    };

    service.on<T>(eventType, listener);

    // Cleanup: remove event listener on unmount
    return () => {
      service.off<T>(eventType, listener);
    };
  }, [eventType, callback, service]);
}
