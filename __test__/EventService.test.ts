import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from '../src/core/EventService';

describe('EventService', () => {
  let service: EventService;

  beforeEach(() => {
    service = new EventService();
  });

  describe('emit and on', () => {
    it('should emit events to registered listeners', () => {
      const listener = vi.fn();
      service.on('test-event', listener);

      service.emit('test-event', { message: 'Hello' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        type: 'test-event',
        data: { message: 'Hello' },
      });
    });

    it('should emit events to multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      service.on('test-event', listener1);
      service.on('test-event', listener2);
      service.on('test-event', listener3);

      service.emit('test-event', { value: 123 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);

      const expectedPayload = { type: 'test-event', data: { value: 123 } };
      expect(listener1).toHaveBeenCalledWith(expectedPayload);
      expect(listener2).toHaveBeenCalledWith(expectedPayload);
      expect(listener3).toHaveBeenCalledWith(expectedPayload);
    });

    it('should not trigger listeners for different events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.on('event1', listener1);
      service.on('event2', listener2);

      service.emit('event1', { data: 'test' });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should handle emitting events with no listeners', () => {
      expect(() => {
        service.emit('no-listeners', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle errors in listener callbacks', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      service.on('test-event', errorListener);
      service.on('test-event', normalListener);

      service.emit('test-event', { data: 'test' });

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const listener = vi.fn();

      service.on('test-event', listener);
      service.emit('test-event', { data: 'first' });
      expect(listener).toHaveBeenCalledTimes(1);

      service.off('test-event', listener);
      service.emit('test-event', { data: 'second' });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should only remove the specified listener, not others', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.on('test-event', listener1);
      service.on('test-event', listener2);

      service.off('test-event', listener1);
      service.emit('test-event', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent listener', () => {
      const listener = vi.fn();

      expect(() => {
        service.off('non-existent', listener);
      }).not.toThrow();
    });

    it('should clean up event type when all listeners are removed', () => {
      const listener = vi.fn();

      service.on('test-event', listener);
      expect(service.listenerCount('test-event')).toBe(1);

      service.off('test-event', listener);
      expect(service.listenerCount('test-event')).toBe(0);
      expect(service.eventTypes()).not.toContain('test-event');
    });
  });

  describe('clear', () => {
    it('should clear all listeners for a specific event type', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.on('test-event', listener1);
      service.on('test-event', listener2);

      service.clear('test-event');
      service.emit('test-event', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(service.listenerCount('test-event')).toBe(0);
    });

    it('should not affect other event types', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.on('event1', listener1);
      service.on('event2', listener2);

      service.clear('event1');

      service.emit('event1', { data: 'test' });
      service.emit('event2', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearAll', () => {
    it('should remove all listeners from all events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      service.on('event1', listener1);
      service.on('event2', listener2);
      service.on('event3', listener3);

      service.clearAll();

      service.emit('event1', { data: 'test' });
      service.emit('event2', { data: 'test' });
      service.emit('event3', { data: 'test' });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).not.toHaveBeenCalled();
      expect(service.eventTypes()).toHaveLength(0);
    });
  });

  describe('listenerCount', () => {
    it('should return the correct number of listeners', () => {
      expect(service.listenerCount('test-event')).toBe(0);

      service.on('test-event', vi.fn());
      expect(service.listenerCount('test-event')).toBe(1);

      service.on('test-event', vi.fn());
      expect(service.listenerCount('test-event')).toBe(2);

      service.on('test-event', vi.fn());
      expect(service.listenerCount('test-event')).toBe(3);
    });

    it('should return 0 for non-existent event types', () => {
      expect(service.listenerCount('non-existent')).toBe(0);
    });
  });

  describe('eventTypes', () => {
    it('should return all registered event types', () => {
      expect(service.eventTypes()).toHaveLength(0);

      service.on('event1', vi.fn());
      service.on('event2', vi.fn());
      service.on('event3', vi.fn());

      const types = service.eventTypes();
      expect(types).toHaveLength(3);
      expect(types).toContain('event1');
      expect(types).toContain('event2');
      expect(types).toContain('event3');
    });

    it('should not include events after all listeners are removed', () => {
      const listener = vi.fn();

      service.on('test-event', listener);
      expect(service.eventTypes()).toContain('test-event');

      service.off('test-event', listener);
      expect(service.eventTypes()).not.toContain('test-event');
    });
  });

  describe('Type safety', () => {
    it('should work with different data types', () => {
      const stringListener = vi.fn();
      const numberListener = vi.fn();
      const objectListener = vi.fn();
      const arrayListener = vi.fn();

      service.on<string>('string-event', stringListener);
      service.on<number>('number-event', numberListener);
      service.on<{ id: number }>('object-event', objectListener);
      service.on<number[]>('array-event', arrayListener);

      service.emit<string>('string-event', 'hello');
      service.emit<number>('number-event', 42);
      service.emit<{ id: number }>('object-event', { id: 1 });
      service.emit<number[]>('array-event', [1, 2, 3]);

      expect(stringListener).toHaveBeenCalledWith({ type: 'string-event', data: 'hello' });
      expect(numberListener).toHaveBeenCalledWith({ type: 'number-event', data: 42 });
      expect(objectListener).toHaveBeenCalledWith({ type: 'object-event', data: { id: 1 } });
      expect(arrayListener).toHaveBeenCalledWith({ type: 'array-event', data: [1, 2, 3] });
    });
  });

  describe('Edge cases', () => {
    it('should handle same listener registered multiple times', () => {
      const listener = vi.fn();

      service.on('test-event', listener);
      service.on('test-event', listener);
      service.on('test-event', listener);

      service.emit('test-event', { data: 'test' });

      // Set only stores unique references, so listener is called once
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid emit calls', () => {
      const listener = vi.fn();
      service.on('test-event', listener);

      for (let i = 0; i < 100; i++) {
        service.emit('test-event', { count: i });
      }

      expect(listener).toHaveBeenCalledTimes(100);
    });

    it('should handle listener that adds new listeners during execution', () => {
      const listener2 = vi.fn();
      const listener1 = vi.fn(() => {
        service.on('test-event', listener2);
      });

      service.on('test-event', listener1);
      service.emit('test-event', { data: 'test' });

      expect(listener1).toHaveBeenCalledTimes(1);
      // listener2 might be called in the same emit due to Set iteration
      // The important thing is that it's registered and will be called in future emits

      service.emit('test-event', { data: 'test2' });
      // Both listeners should be called now
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalled();
    });

    it('should handle listener that removes itself during execution', () => {
      let listener: any;
      listener = vi.fn(() => {
        service.off('test-event', listener);
      });

      service.on('test-event', listener);

      service.emit('test-event', { data: 'test1' });
      expect(listener).toHaveBeenCalledTimes(1);

      service.emit('test-event', { data: 'test2' });
      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});
