import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventState } from '../src/react/useEventState';
import { EventService } from '../src/core/EventService';

describe('useEventState', () => {
  let mockService: EventService;

  beforeEach(() => {
    mockService = new EventService();
  });

  describe('Basic functionality', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() =>
        useEventState('test-event', { count: 0 }, mockService)
      );

      expect(result.current).toEqual({ count: 0 });
    });

    it('should update state when event is emitted', () => {
      const { result } = renderHook(() =>
        useEventState('test-event', { count: 0 }, mockService)
      );

      expect(result.current).toEqual({ count: 0 });

      act(() => {
        mockService.emit('test-event', { count: 5 });
      });

      expect(result.current).toEqual({ count: 5 });
    });

    it('should update state multiple times', () => {
      const { result } = renderHook(() =>
        useEventState('counter', 0, mockService)
      );

      expect(result.current).toBe(0);

      act(() => {
        mockService.emit('counter', 1);
      });
      expect(result.current).toBe(1);

      act(() => {
        mockService.emit('counter', 5);
      });
      expect(result.current).toBe(5);

      act(() => {
        mockService.emit('counter', 10);
      });
      expect(result.current).toBe(10);
    });

    it('should use default eventService when service not provided', async () => {
      const { eventService } = await import('../src/core/EventService');

      const { result } = renderHook(() =>
        useEventState('test-event', 'initial')
      );

      expect(result.current).toBe('initial');

      act(() => {
        eventService.emit('test-event', 'updated');
      });

      expect(result.current).toBe('updated');

      // Cleanup
      eventService.clear('test-event');
    });
  });

  describe('Type safety', () => {
    it('should work with string state', () => {
      const { result } = renderHook(() =>
        useEventState<string>('string-event', 'initial', mockService)
      );

      expect(result.current).toBe('initial');

      act(() => {
        mockService.emit<string>('string-event', 'updated');
      });

      expect(result.current).toBe('updated');
    });

    it('should work with number state', () => {
      const { result } = renderHook(() =>
        useEventState<number>('number-event', 0, mockService)
      );

      expect(result.current).toBe(0);

      act(() => {
        mockService.emit<number>('number-event', 42);
      });

      expect(result.current).toBe(42);
    });

    it('should work with object state', () => {
      interface User {
        id: number;
        name: string;
      }

      const initialUser: User = { id: 0, name: 'Guest' };

      const { result } = renderHook(() =>
        useEventState<User>('user-event', initialUser, mockService)
      );

      expect(result.current).toEqual({ id: 0, name: 'Guest' });

      act(() => {
        mockService.emit<User>('user-event', { id: 1, name: 'John' });
      });

      expect(result.current).toEqual({ id: 1, name: 'John' });
    });

    it('should work with array state', () => {
      const { result } = renderHook(() =>
        useEventState<number[]>('array-event', [], mockService)
      );

      expect(result.current).toEqual([]);

      act(() => {
        mockService.emit<number[]>('array-event', [1, 2, 3]);
      });

      expect(result.current).toEqual([1, 2, 3]);
    });

    it('should work with complex nested state', () => {
      interface ComplexState {
        user: { id: number; name: string };
        settings: { theme: string; notifications: boolean };
        items: number[];
      }

      const initialState: ComplexState = {
        user: { id: 0, name: 'Guest' },
        settings: { theme: 'light', notifications: false },
        items: [],
      };

      const { result } = renderHook(() =>
        useEventState<ComplexState>('complex-event', initialState, mockService)
      );

      expect(result.current).toEqual(initialState);

      const newState: ComplexState = {
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark', notifications: true },
        items: [1, 2, 3],
      };

      act(() => {
        mockService.emit<ComplexState>('complex-event', newState);
      });

      expect(result.current).toEqual(newState);
    });
  });

  describe('Event filtering', () => {
    it('should only update on the specified event type', () => {
      const { result } = renderHook(() =>
        useEventState('target-event', 'initial', mockService)
      );

      act(() => {
        mockService.emit('other-event', 'should not update');
        mockService.emit('another-event', 'also should not update');
      });

      expect(result.current).toBe('initial');

      act(() => {
        mockService.emit('target-event', 'updated');
      });

      expect(result.current).toBe('updated');
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useEventState('test-event', 0, mockService)
      );

      act(() => {
        mockService.emit('test-event', 5);
      });
      expect(result.current).toBe(5);

      unmount();

      // Event should not update state after unmount
      act(() => {
        mockService.emit('test-event', 10);
      });

      // State should still be 5 (no update after unmount)
      expect(result.current).toBe(5);
      expect(mockService.listenerCount('test-event')).toBe(0);
    });

    it('should not leak memory after multiple mount/unmount cycles', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() =>
          useEventState('test-event', 0, mockService)
        );
        unmount();
      }

      expect(mockService.listenerCount('test-event')).toBe(0);
    });
  });

  describe('Service changes', () => {
    it('should resubscribe when service changes', () => {
      const service1 = new EventService();
      const service2 = new EventService();

      const { result, rerender } = renderHook(
        ({ service }) => useEventState('test-event', 0, service),
        { initialProps: { service: service1 } }
      );

      act(() => {
        service1.emit('test-event', 5);
      });
      expect(result.current).toBe(5);

      // Change service
      rerender({ service: service2 });

      act(() => {
        service1.emit('test-event', 10); // Should not affect state
        service2.emit('test-event', 15); // Should update state
      });

      expect(result.current).toBe(15);
    });
  });

  describe('Edge cases', () => {
    it('should handle null state', () => {
      const { result } = renderHook(() =>
        useEventState<string | null>('test-event', null, mockService)
      );

      expect(result.current).toBeNull();

      act(() => {
        mockService.emit<string | null>('test-event', 'not null');
      });

      expect(result.current).toBe('not null');

      act(() => {
        mockService.emit<string | null>('test-event', null);
      });

      expect(result.current).toBeNull();
    });

    it('should handle undefined state', () => {
      const { result } = renderHook(() =>
        useEventState<string | undefined>('test-event', undefined, mockService)
      );

      expect(result.current).toBeUndefined();

      act(() => {
        mockService.emit<string | undefined>('test-event', 'defined');
      });

      expect(result.current).toBe('defined');

      act(() => {
        mockService.emit<string | undefined>('test-event', undefined);
      });

      expect(result.current).toBeUndefined();
    });

    it('should handle boolean state', () => {
      const { result } = renderHook(() =>
        useEventState<boolean>('toggle-event', false, mockService)
      );

      expect(result.current).toBe(false);

      act(() => {
        mockService.emit<boolean>('toggle-event', true);
      });

      expect(result.current).toBe(true);

      act(() => {
        mockService.emit<boolean>('toggle-event', false);
      });

      expect(result.current).toBe(false);
    });

    it('should handle rapid state updates', () => {
      const { result } = renderHook(() =>
        useEventState('counter', 0, mockService)
      );

      act(() => {
        for (let i = 1; i <= 100; i++) {
          mockService.emit('counter', i);
        }
      });

      expect(result.current).toBe(100);
    });

    it('should handle same value emissions', () => {
      const { result } = renderHook(() =>
        useEventState('test-event', 'value', mockService)
      );

      act(() => {
        mockService.emit('test-event', 'value');
        mockService.emit('test-event', 'value');
        mockService.emit('test-event', 'value');
      });

      expect(result.current).toBe('value');
    });

    it('should handle object identity changes', () => {
      const { result } = renderHook(() =>
        useEventState('test-event', { count: 0 }, mockService)
      );

      const obj1 = { count: 5 };
      const obj2 = { count: 5 };

      act(() => {
        mockService.emit('test-event', obj1);
      });

      expect(result.current).toBe(obj1);
      expect(result.current).not.toBe(obj2);

      act(() => {
        mockService.emit('test-event', obj2);
      });

      expect(result.current).toBe(obj2);
      expect(result.current).not.toBe(obj1);
    });
  });

  describe('Multiple instances', () => {
    it('should allow multiple hooks with the same event and service', () => {
      const { result: result1 } = renderHook(() =>
        useEventState('shared-event', 0, mockService)
      );

      const { result: result2 } = renderHook(() =>
        useEventState('shared-event', 0, mockService)
      );

      expect(result1.current).toBe(0);
      expect(result2.current).toBe(0);

      act(() => {
        mockService.emit('shared-event', 42);
      });

      expect(result1.current).toBe(42);
      expect(result2.current).toBe(42);
    });

    it('should allow different initial states for the same event', () => {
      const { result: result1 } = renderHook(() =>
        useEventState('test-event', 'initial1', mockService)
      );

      const { result: result2 } = renderHook(() =>
        useEventState('test-event', 'initial2', mockService)
      );

      expect(result1.current).toBe('initial1');
      expect(result2.current).toBe('initial2');

      act(() => {
        mockService.emit('test-event', 'updated');
      });

      expect(result1.current).toBe('updated');
      expect(result2.current).toBe('updated');
    });

    it('should maintain independent state for different events', () => {
      const { result: result1 } = renderHook(() =>
        useEventState('event1', 'value1', mockService)
      );

      const { result: result2 } = renderHook(() =>
        useEventState('event2', 'value2', mockService)
      );

      act(() => {
        mockService.emit('event1', 'updated1');
      });

      expect(result1.current).toBe('updated1');
      expect(result2.current).toBe('value2');

      act(() => {
        mockService.emit('event2', 'updated2');
      });

      expect(result1.current).toBe('updated1');
      expect(result2.current).toBe('updated2');
    });
  });
});
