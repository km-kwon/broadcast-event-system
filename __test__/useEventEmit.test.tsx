import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventEmit } from '../src/react/useEventEmit';
import { EventService, eventService } from '../src/core/EventService';

describe('useEventEmit', () => {
  let mockService: EventService;

  beforeEach(() => {
    mockService = new EventService();
  });

  describe('Basic functionality', () => {
    it('should return an emit function', () => {
      const { result } = renderHook(() => useEventEmit());

      expect(result.current).toBeInstanceOf(Function);
    });

    it('should emit events using the default eventService', () => {
      const { result } = renderHook(() => useEventEmit());
      const mockListener = vi.fn();

      // Subscribe to the event using the default service
      eventService.on('test-event', mockListener);

      // Emit the event
      result.current('test-event', { message: 'Hello' });

      // Verify the listener was called
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith({
        type: 'test-event',
        data: { message: 'Hello' },
      });

      // Cleanup
      eventService.off('test-event', mockListener);
    });
  });

  describe('Custom service', () => {
    it('should use a custom event service when provided', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const mockListener = vi.fn();

      // Subscribe to the event using the custom service
      mockService.on('custom-event', mockListener);

      // Emit the event
      result.current('custom-event', { value: 123 });

      // Verify the listener was called
      expect(mockListener).toHaveBeenCalledTimes(1);
      expect(mockListener).toHaveBeenCalledWith({
        type: 'custom-event',
        data: { value: 123 },
      });
    });

    it('should not trigger listeners on different service instances', () => {
      const service1 = new EventService();
      const service2 = new EventService();

      const { result } = renderHook(() => useEventEmit(service1));
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service1.on('event', listener1);
      service2.on('event', listener2);

      // Emit on service1
      result.current('event', { data: 'test' });

      // Only listener1 should be called
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Type safety', () => {
    it('should handle different data types correctly', () => {
      const { result } = renderHook(() => useEventEmit(mockService));

      // String data
      const stringListener = vi.fn();
      mockService.on<string>('string-event', stringListener);
      result.current<string>('string-event', 'test string');
      expect(stringListener).toHaveBeenCalledWith({
        type: 'string-event',
        data: 'test string',
      });

      // Number data
      const numberListener = vi.fn();
      mockService.on<number>('number-event', numberListener);
      result.current<number>('number-event', 42);
      expect(numberListener).toHaveBeenCalledWith({
        type: 'number-event',
        data: 42,
      });

      // Object data
      interface CustomType {
        id: number;
        name: string;
      }
      const objectListener = vi.fn();
      mockService.on<CustomType>('object-event', objectListener);
      result.current<CustomType>('object-event', { id: 1, name: 'Test' });
      expect(objectListener).toHaveBeenCalledWith({
        type: 'object-event',
        data: { id: 1, name: 'Test' },
      });

      // Array data
      const arrayListener = vi.fn();
      mockService.on<number[]>('array-event', arrayListener);
      result.current<number[]>('array-event', [1, 2, 3]);
      expect(arrayListener).toHaveBeenCalledWith({
        type: 'array-event',
        data: [1, 2, 3],
      });
    });

    it('should handle null and undefined data', () => {
      const { result } = renderHook(() => useEventEmit(mockService));

      const nullListener = vi.fn();
      mockService.on<null>('null-event', nullListener);
      result.current<null>('null-event', null);
      expect(nullListener).toHaveBeenCalledWith({
        type: 'null-event',
        data: null,
      });

      const undefinedListener = vi.fn();
      mockService.on<undefined>('undefined-event', undefinedListener);
      result.current<undefined>('undefined-event', undefined);
      expect(undefinedListener).toHaveBeenCalledWith({
        type: 'undefined-event',
        data: undefined,
      });
    });
  });

  describe('Memoization', () => {
    it('should return the same function reference when service does not change', () => {
      const { result, rerender } = renderHook(() => useEventEmit(mockService));

      const firstEmit = result.current;

      // Re-render with the same service
      rerender();

      const secondEmit = result.current;

      // Should be the same reference (memoized)
      expect(firstEmit).toBe(secondEmit);
    });

    it('should return a new function reference when service changes', () => {
      const service1 = new EventService();
      const service2 = new EventService();

      const { result, rerender } = renderHook(
        ({ service }) => useEventEmit(service),
        { initialProps: { service: service1 } }
      );

      const firstEmit = result.current;

      // Re-render with a different service
      rerender({ service: service2 });

      const secondEmit = result.current;

      // Should be a different reference
      expect(firstEmit).not.toBe(secondEmit);
    });
  });

  describe('Edge cases', () => {
    it('should handle emitting to an event with no listeners', () => {
      const { result } = renderHook(() => useEventEmit(mockService));

      // Should not throw even when there are no listeners
      expect(() => {
        result.current('no-listeners-event', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle emitting multiple events in sequence', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      mockService.on('event1', listener1);
      mockService.on('event2', listener2);
      mockService.on('event3', listener3);

      result.current('event1', { data: '1' });
      result.current('event2', { data: '2' });
      result.current('event3', { data: '3' });

      expect(listener1).toHaveBeenCalledWith({ type: 'event1', data: { data: '1' } });
      expect(listener2).toHaveBeenCalledWith({ type: 'event2', data: { data: '2' } });
      expect(listener3).toHaveBeenCalledWith({ type: 'event3', data: { data: '3' } });
    });

    it('should handle emitting the same event multiple times', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener = vi.fn();

      mockService.on('repeated-event', listener);

      result.current('repeated-event', { count: 1 });
      result.current('repeated-event', { count: 2 });
      result.current('repeated-event', { count: 3 });

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, {
        type: 'repeated-event',
        data: { count: 1 },
      });
      expect(listener).toHaveBeenNthCalledWith(2, {
        type: 'repeated-event',
        data: { count: 2 },
      });
      expect(listener).toHaveBeenNthCalledWith(3, {
        type: 'repeated-event',
        data: { count: 3 },
      });
    });

    it('should handle emitting to multiple listeners for the same event', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      mockService.on('multi-listener-event', listener1);
      mockService.on('multi-listener-event', listener2);
      mockService.on('multi-listener-event', listener3);

      result.current('multi-listener-event', { message: 'broadcast' });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      const expectedPayload = {
        type: 'multi-listener-event',
        data: { message: 'broadcast' },
      };
      expect(listener1).toHaveBeenCalledWith(expectedPayload);
      expect(listener2).toHaveBeenCalledWith(expectedPayload);
      expect(listener3).toHaveBeenCalledWith(expectedPayload);
    });
  });

  describe('Integration with EventService', () => {
    it('should work correctly with EventService lifecycle methods', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener = vi.fn();

      // Add listener
      mockService.on('lifecycle-event', listener);
      expect(mockService.listenerCount('lifecycle-event')).toBe(1);

      // Emit event
      result.current('lifecycle-event', { action: 'test' });
      expect(listener).toHaveBeenCalledTimes(1);

      // Remove listener
      mockService.off('lifecycle-event', listener);
      expect(mockService.listenerCount('lifecycle-event')).toBe(0);

      // Emit again - listener should not be called
      result.current('lifecycle-event', { action: 'test2' });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should respect EventService clear method', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      mockService.on('clear-test-1', listener1);
      mockService.on('clear-test-2', listener2);

      // Clear specific event
      mockService.clear('clear-test-1');

      result.current('clear-test-1', { data: 'test' });
      result.current('clear-test-2', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should respect EventService clearAll method', () => {
      const { result } = renderHook(() => useEventEmit(mockService));
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      mockService.on('event-1', listener1);
      mockService.on('event-2', listener2);

      // Clear all events
      mockService.clearAll();

      result.current('event-1', { data: 'test' });
      result.current('event-2', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});
