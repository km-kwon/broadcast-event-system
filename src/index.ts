/**
 * broadcast-event-system
 * Type-safe event bus and broadcast service for React applications
 */

// Core services
export { EventService, eventService } from './core/EventService';
export { BroadcastService, broadcastService } from './core/BroadcastService';

// React hooks
export { useEventEmit } from './react/useEventEmit';
export { useEventOn } from './react/useEventOn';
export { useEventState } from './react/useEventState';
export { useBroadcast, useBroadcastOn } from './react/useBroadcast';

// Types
export type {
  EventPayload,
  EventListener,
  IEventService,
  IBroadcastService,
} from './types/events';
