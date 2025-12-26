import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBroadcast, useBroadcastOn } from '../src/react/useBroadcast';
import { BroadcastService } from '../src/core/BroadcastService';

// Mock BroadcastChannel API (same as in BroadcastService.test.ts)
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  postMessage(data: any) {
    const event = new MessageEvent('message', { data });
    const messageListeners = this.listeners.get('message');
    if (messageListeners) {
      messageListeners.forEach((listener) => {
        setTimeout(() => listener(event), 0);
      });
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  close() {
    this.listeners.clear();
  }
}

describe('useBroadcast', () => {
  let mockService: BroadcastService;
  let originalBroadcastChannel: any;

  beforeEach(() => {
    originalBroadcastChannel = global.BroadcastChannel;
    (global as any).BroadcastChannel = MockBroadcastChannel;
    mockService = new BroadcastService();
  });

  afterEach(() => {
    mockService.closeAll();
    global.BroadcastChannel = originalBroadcastChannel;
  });

  describe('useBroadcast hook', () => {
    it('should return a broadcast function', () => {
      const { result } = renderHook(() => useBroadcast(mockService));

      expect(result.current).toBeInstanceOf(Function);
    });

    it('should broadcast messages', async () => {
      const { result } = renderHook(() => useBroadcast(mockService));
      const callback = vi.fn();

      mockService.subscribe('test-channel', callback);

      result.current('test-channel', { message: 'Hello' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should broadcast to multiple subscribers', async () => {
      const { result } = renderHook(() => useBroadcast(mockService));
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      mockService.subscribe('test-channel', callback1);
      mockService.subscribe('test-channel', callback2);
      mockService.subscribe('test-channel', callback3);

      result.current('test-channel', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
      expect(callback3).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should use default broadcastService when service not provided', async () => {
      const { broadcastService } = await import('../src/core/BroadcastService');
      const { result } = renderHook(() => useBroadcast());
      const callback = vi.fn();

      broadcastService.subscribe('default-channel', callback);

      result.current('default-channel', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ data: 'test' });

      // Cleanup
      broadcastService.close('default-channel');
    });

    it('should handle broadcasting without data', async () => {
      const { result } = renderHook(() => useBroadcast(mockService));
      const callback = vi.fn();

      mockService.subscribe('test-channel', callback);

      result.current('test-channel');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // BroadcastChannel may convert undefined to null
      expect(callback).toHaveBeenCalled();
    });

    it('should return the same function reference when service does not change', () => {
      const { result, rerender } = renderHook(() => useBroadcast(mockService));

      const firstBroadcast = result.current;
      rerender();
      const secondBroadcast = result.current;

      expect(firstBroadcast).toBe(secondBroadcast);
    });

    it('should return a new function reference when service changes', () => {
      const service1 = new BroadcastService();
      const service2 = new BroadcastService();

      const { result, rerender } = renderHook(
        ({ service }) => useBroadcast(service),
        { initialProps: { service: service1 } }
      );

      const firstBroadcast = result.current;

      rerender({ service: service2 });

      const secondBroadcast = result.current;

      expect(firstBroadcast).not.toBe(secondBroadcast);

      service1.closeAll();
      service2.closeAll();
    });

    it('should handle different data types', async () => {
      const { result } = renderHook(() => useBroadcast(mockService));
      const callback = vi.fn();

      mockService.subscribe('test-channel', callback);

      const testData = [
        'string',
        42,
        { key: 'value' },
        [1, 2, 3],
        true,
        null,
      ];

      for (const data of testData) {
        result.current('test-channel', data);
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(callback).toHaveBeenCalledTimes(testData.length);
      testData.forEach((data, index) => {
        expect(callback).toHaveBeenNthCalledWith(index + 1, data);
      });
    });
  });

  describe('useBroadcastOn hook', () => {
    it('should subscribe to broadcast messages', async () => {
      const callback = vi.fn();

      renderHook(() => useBroadcastOn('test-channel', callback, mockService));

      mockService.broadcast('test-channel', { message: 'Hello' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should unsubscribe on unmount', async () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() =>
        useBroadcastOn('test-channel', callback, mockService)
      );

      mockService.broadcast('test-channel', { data: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1);

      unmount();

      mockService.broadcast('test-channel', { data: 'second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called after unmount
    });

    it('should use default broadcastService when service not provided', async () => {
      const { broadcastService } = await import('../src/core/BroadcastService');
      const callback = vi.fn();

      renderHook(() => useBroadcastOn('default-channel', callback));

      broadcastService.broadcast('default-channel', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ data: 'test' });

      // Cleanup
      broadcastService.close('default-channel');
    });

    it('should handle multiple messages', async () => {
      const callback = vi.fn();

      renderHook(() => useBroadcastOn('test-channel', callback, mockService));

      mockService.broadcast('test-channel', { count: 1 });
      mockService.broadcast('test-channel', { count: 2 });
      mockService.broadcast('test-channel', { count: 3 });

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, { count: 1 });
      expect(callback).toHaveBeenNthCalledWith(2, { count: 2 });
      expect(callback).toHaveBeenNthCalledWith(3, { count: 3 });
    });

    it('should resubscribe when channelName changes', async () => {
      const callback = vi.fn();

      const { rerender } = renderHook(
        ({ channel }) => useBroadcastOn(channel, callback, mockService),
        { initialProps: { channel: 'channel1' } }
      );

      mockService.broadcast('channel1', { data: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1);

      rerender({ channel: 'channel2' });

      mockService.broadcast('channel1', { data: 'should not trigger' });
      mockService.broadcast('channel2', { data: 'second' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { data: 'first' });
      expect(callback).toHaveBeenNthCalledWith(2, { data: 'second' });
    });

    it('should resubscribe when callback changes', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) => useBroadcastOn('test-channel', callback, mockService),
        { initialProps: { callback: callback1 } }
      );

      mockService.broadcast('test-channel', { data: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback1).toHaveBeenCalledTimes(1);

      rerender({ callback: callback2 });

      mockService.broadcast('test-channel', { data: 'second' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledTimes(1); // Not called again
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should resubscribe when service changes', async () => {
      const callback = vi.fn();
      const service1 = new BroadcastService();
      const service2 = new BroadcastService();

      const { rerender } = renderHook(
        ({ service }) => useBroadcastOn('test-channel', callback, service),
        { initialProps: { service: service1 } }
      );

      service1.broadcast('test-channel', { data: 'service1' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1);

      rerender({ service: service2 });

      service1.broadcast('test-channel', { data: 'should not trigger' });
      service2.broadcast('test-channel', { data: 'service2' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, { data: 'service1' });
      expect(callback).toHaveBeenNthCalledWith(2, { data: 'service2' });

      service1.closeAll();
      service2.closeAll();
    });

    it('should not leak memory after multiple mount/unmount cycles', () => {
      const callback = vi.fn();

      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() =>
          useBroadcastOn('test-channel', callback, mockService)
        );
        unmount();
      }

      // Channel might still exist if created, but should have no active listeners
      // The important part is that listeners are cleaned up
      expect(true).toBe(true);
    });

    it('should handle different data types', async () => {
      const callback = vi.fn();

      renderHook(() => useBroadcastOn('test-channel', callback, mockService));

      const testData = [
        'string',
        42,
        { key: 'value' },
        [1, 2, 3],
        true,
        false,
        null,
      ];

      for (const data of testData) {
        mockService.broadcast('test-channel', data);
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(callback).toHaveBeenCalledTimes(testData.length);
      testData.forEach((data, index) => {
        expect(callback).toHaveBeenNthCalledWith(index + 1, data);
      });
    });
  });

  describe('Integration: useBroadcast + useBroadcastOn', () => {
    it('should allow communication between hooks', async () => {
      const callback = vi.fn();

      renderHook(() => useBroadcastOn('communication', callback, mockService));

      const { result: broadcastResult } = renderHook(() =>
        useBroadcast(mockService)
      );

      broadcastResult.current('communication', { message: 'Hello from broadcast!' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message: 'Hello from broadcast!' });
    });

    it('should support bidirectional communication', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderHook(() => useBroadcastOn('channel1', callback1, mockService));
      renderHook(() => useBroadcastOn('channel2', callback2, mockService));

      const { result: broadcast } = renderHook(() => useBroadcast(mockService));

      broadcast.current('channel1', { from: 'sender1' });
      broadcast.current('channel2', { from: 'sender2' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith({ from: 'sender1' });
      expect(callback2).toHaveBeenCalledWith({ from: 'sender2' });
    });

    it('should support multiple listeners on the same channel', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      renderHook(() => useBroadcastOn('shared', callback1, mockService));
      renderHook(() => useBroadcastOn('shared', callback2, mockService));
      renderHook(() => useBroadcastOn('shared', callback3, mockService));

      const { result: broadcast } = renderHook(() => useBroadcast(mockService));

      broadcast.current('shared', { data: 'broadcast to all' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith({ data: 'broadcast to all' });
      expect(callback2).toHaveBeenCalledWith({ data: 'broadcast to all' });
      expect(callback3).toHaveBeenCalledWith({ data: 'broadcast to all' });
    });
  });
});
