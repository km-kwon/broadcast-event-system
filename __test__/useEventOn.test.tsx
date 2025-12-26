import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventOn } from '../src/react/useEventOn';
import { EventService } from '../src/core/EventService';

describe('useEventOn', () => {
  let mockService: EventService;

  beforeEach(() => {
    mockService = new EventService();
  });

  describe('Basic functionality', () => {
    it('should subscribe to events on mount', () => {
      const callback = vi.fn();

      renderHook(() => useEventOn('test-event', callback, mockService));

      mockService.emit('test-event', { message: 'Hello' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should unsubscribe from events on unmount', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() =>
        useEventOn('test-event', callback, mockService)
      );

      mockService.emit('test-event', { message: 'First' });
      expect(callback).toHaveBeenCalledTimes(1);

      unmount();

      mockService.emit('test-event', { message: 'Second' });
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called after unmount
    });

    it('should use default eventService when service not provided', async () => {
      const { eventService } = await import('../src/core/EventService');
      const callback = vi.fn();

      renderHook(() => useEventOn('test-event', callback));

      eventService.emit('test-event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });

      // Cleanup
      eventService.clear('test-event');
    });

    it('should handle multiple event emissions', () => {
      const callback = vi.fn();

      renderHook(() => useEventOn('test-event', callback, mockService));

      mockService.emit('test-event', { count: 1 });
      mockService.emit('test-event', { count: 2 });
      mockService.emit('test-event', { count: 3 });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(callback).toHaveBeenNthCalledWith(2, { count: 2 });
      expect(callback).toHaveBeenNthCalledWith(3, { count: 3 });
    });
  });

  describe('Event type filtering', () => {
    it('should only respond to the specified event type', () => {
      const callback = vi.fn();

      renderHook(() => useEventOn('target-event', callback, mockService));

      mockService.emit('other-event', { data: 'should not trigger' });
      mockService.emit('target-event', { data: 'should trigger' });
      mockService.emit('another-event', { data: 'should not trigger' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'should trigger' });
    });
  });

  describe('Resubscription on dependency change', () => {
    it('should resubscribe when eventType changes', () => {
      const callback = vi.fn();

      const { rerender } = renderHook(
        ({ eventType }) => useEventOn(eventType, callback, mockService),
        { initialProps: { eventType: 'event1' } }
      );

      mockService.emit('event1', { data: 'first' });
      expect(callback).toHaveBeenCalledTimes(1);

      // Change event type
      rerender({ eventType: 'event2' });

      mockService.emit('event1', { data: 'should not trigger' });
      mockService.emit('event2', { data: 'second' });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { data: 'first' });
      expect(callback).toHaveBeenNthCalledWith(2, { data: 'second' });
    });

    it('should resubscribe when callback changes', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) => useEventOn('test-event', callback, mockService),
        { initialProps: { callback: callback1 } }
      );

      mockService.emit('test-event', { data: 'first' });
      expect(callback1).toHaveBeenCalledTimes(1);

      // Change callback
      rerender({ callback: callback2 });

      mockService.emit('test-event', { data: 'second' });

      expect(callback1).toHaveBeenCalledTimes(1); // Not called again
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith({ data: 'second' });
    });

    it('should resubscribe when service changes', () => {
      const callback = vi.fn();
      const service1 = new EventService();
      const service2 = new EventService();

      const { rerender } = renderHook(
        ({ service }) => useEventOn('test-event', callback, service),
        { initialProps: { service: service1 } }
      );

      service1.emit('test-event', { data: 'service1' });
      expect(callback).toHaveBeenCalledTimes(1);

      // Change service
      rerender({ service: service2 });

      service1.emit('test-event', { data: 'should not trigger' });
      service2.emit('test-event', { data: 'service2' });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { data: 'service1' });
      expect(callback).toHaveBeenNthCalledWith(2, { data: 'service2' });
    });
  });

  describe('Type safety', () => {
    it('should work with typed events', () => {
      interface UserEvent {
        id: number;
        name: string;
      }

      const callback = vi.fn();

      renderHook(() => useEventOn<UserEvent>('user-event', callback, mockService));

      mockService.emit<UserEvent>('user-event', { id: 1, name: 'John' });

      expect(callback).toHaveBeenCalledWith({ id: 1, name: 'John' });
    });

    it('should handle different data types', () => {
      const stringCallback = vi.fn();
      const numberCallback = vi.fn();
      const arrayCallback = vi.fn();

      renderHook(() => useEventOn<string>('string-event', stringCallback, mockService));
      renderHook(() => useEventOn<number>('number-event', numberCallback, mockService));
      renderHook(() => useEventOn<number[]>('array-event', arrayCallback, mockService));

      mockService.emit<string>('string-event', 'hello');
      mockService.emit<number>('number-event', 42);
      mockService.emit<number[]>('array-event', [1, 2, 3]);

      expect(stringCallback).toHaveBeenCalledWith('hello');
      expect(numberCallback).toHaveBeenCalledWith(42);
      expect(arrayCallback).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('Edge cases', () => {
    it('should handle events emitted before subscription', () => {
      const callback = vi.fn();

      mockService.emit('test-event', { data: 'before subscription' });

      renderHook(() => useEventOn('test-event', callback, mockService));

      expect(callback).not.toHaveBeenCalled();

      mockService.emit('test-event', { data: 'after subscription' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ data: 'after subscription' });
    });

    it('should handle rapid resubscriptions', () => {
      const callback = vi.fn();

      const { rerender, unmount } = renderHook(
        ({ eventType }) => useEventOn(eventType, callback, mockService),
        { initialProps: { eventType: 'event1' } }
      );

      for (let i = 0; i < 10; i++) {
        rerender({ eventType: `event${i}` });
      }

      mockService.emit('event9', { data: 'final' });

      expect(callback).toHaveBeenCalledWith({ data: 'final' });

      unmount();
    });

    it('should not leak memory after multiple mount/unmount cycles', () => {
      const callback = vi.fn();

      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() =>
          useEventOn('test-event', callback, mockService)
        );
        unmount();
      }

      expect(mockService.listenerCount('test-event')).toBe(0);
    });

    it('should handle null and undefined data', () => {
      const callback = vi.fn();

      renderHook(() => useEventOn('test-event', callback, mockService));

      mockService.emit('test-event', null);
      mockService.emit('test-event', undefined);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, null);
      expect(callback).toHaveBeenNthCalledWith(2, undefined);
    });

    it('should handle callback that throws an error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      renderHook(() => useEventOn('test-event', errorCallback, mockService));

      expect(() => {
        mockService.emit('test-event', { data: 'test' });
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Multiple instances', () => {
    it('should allow multiple hooks listening to the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      renderHook(() => useEventOn('test-event', callback1, mockService));
      renderHook(() => useEventOn('test-event', callback2, mockService));
      renderHook(() => useEventOn('test-event', callback3, mockService));

      mockService.emit('test-event', { data: 'broadcast' });

      expect(callback1).toHaveBeenCalledWith({ data: 'broadcast' });
      expect(callback2).toHaveBeenCalledWith({ data: 'broadcast' });
      expect(callback3).toHaveBeenCalledWith({ data: 'broadcast' });
    });

    it('should allow multiple hooks listening to different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      renderHook(() => useEventOn('event1', callback1, mockService));
      renderHook(() => useEventOn('event2', callback2, mockService));
      renderHook(() => useEventOn('event3', callback3, mockService));

      mockService.emit('event2', { data: 'test' });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
      expect(callback3).not.toHaveBeenCalled();
    });
  });
});
