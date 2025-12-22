import { useCallback } from 'react';
import { eventService } from '../core/EventService';

/**
 * Hook to get an event emission function
 * @param service - Optional custom event service instance (defaults to singleton)
 * @returns Function to emit events
 * @example
 * ```tsx
 * type CounterEvent = { count: number };
 *
 * function MyComponent() {
 *   const emit = useEventEmit();
 *
 *   const handleClick = () => {
 *     emit<CounterEvent>('counter', { count: 1 });
 *   };
 *
 *   return <button onClick={handleClick}>Increment</button>;
 * }
 * ```
 */
export function useEventEmit(service = eventService) {
  return useCallback(
    <T>(eventType: string, data: T) => {
      service.emit(eventType, data);
    },
    [service]
  );
}
