import { useState } from 'react';
import { useEventOn } from './useEventOn';
import { eventService } from '../core/EventService';

/**
 * Hook that combines event subscription with state management
 * Automatically updates state when the specified event is emitted
 * @param eventType - The event type to listen for
 * @param initialState - Initial state value
 * @param service - Optional custom event service instance (defaults to singleton)
 * @returns Current state value that updates when the event is emitted
 * @example
 * ```tsx
 * type CounterEvent = { count: number };
 *
 * function MyComponent() {
 *   const counter = useEventState<CounterEvent>('counter', { count: 0 });
 *
 *   return (
 *     <div>
 *       <h2>Counter: {counter.count}</h2>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEventState<T>(eventType: string, initialState: T, service = eventService): T {
  const [state, setState] = useState<T>(initialState);

  useEventOn<T>(
    eventType,
    (data) => {
      setState(data);
    },
    service
  );

  return state;
}
