import { useCallback, useEffect } from "react";
import { broadcastService } from "../core/BroadcastService";

/**
 * Hook to broadcast messages to other windows/tabs
 * @param service - Optional custom broadcast service instance (defaults to singleton)
 * @returns Function to broadcast messages
 * @example
 * ```tsx
 * function MyComponent() {
 *   const broadcast = useBroadcast();
 *
 *   const handleClick = () => {
 *     broadcast('my-channel', { message: 'Hello from another tab!' });
 *   };
 *
 *   return <button onClick={handleClick}>Broadcast</button>;
 * }
 * ```
 */
export function useBroadcast(service = broadcastService) {
  return useCallback(
    (channelName: string, data?: any) => {
      service.broadcast(channelName, data);
    },
    [service]
  );
}

/**
 * Hook to subscribe to broadcast messages from other windows/tabs
 * Automatically unsubscribes when the component unmounts
 * @param channelName - The channel name to subscribe to
 * @param callback - Function to call when a message is received
 * @param service - Optional custom broadcast service instance (defaults to singleton)
 * @example
 * ```tsx
 * function MyComponent() {
 *   useBroadcastOn('my-channel', (data) => {
 *     console.log('Received message:', data);
 *   });
 *
 *   return <div>Listening to broadcast channel</div>;
 * }
 * ```
 */
export function useBroadcastOn(
  channelName: string,
  callback: (data: any) => void,
  service = broadcastService
) {
  useEffect(() => {
    const listenerId = service.subscribe(channelName, callback);

    // Cleanup: unsubscribe on unmount
    return () => {
      service.unsubscribe(channelName, listenerId);
    };
  }, [channelName, callback, service]);
}
