import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BroadcastService } from '../src/core/BroadcastService';

// Mock BroadcastChannel API
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  postMessage(data: any) {
    // Simulate async message delivery
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

describe('BroadcastService', () => {
  let service: BroadcastService;
  let originalBroadcastChannel: any;

  beforeEach(() => {
    // Mock BroadcastChannel globally
    originalBroadcastChannel = global.BroadcastChannel;
    (global as any).BroadcastChannel = MockBroadcastChannel;

    service = new BroadcastService();
  });

  afterEach(() => {
    service.closeAll();
    // Restore original BroadcastChannel
    global.BroadcastChannel = originalBroadcastChannel;
  });

  describe('subscribe and broadcast', () => {
    it('should subscribe to a channel and receive messages', async () => {
      const callback = vi.fn();
      const listenerId = service.subscribe('test-channel', callback);

      expect(listenerId).toMatch(/^listener_\d+$/);

      service.broadcast('test-channel', { message: 'Hello' });

      // Wait for async message delivery
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should handle multiple subscribers on the same channel', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      service.subscribe('test-channel', callback1);
      service.subscribe('test-channel', callback2);
      service.subscribe('test-channel', callback3);

      service.broadcast('test-channel', { value: 123 });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith({ value: 123 });
      expect(callback2).toHaveBeenCalledWith({ value: 123 });
      expect(callback3).toHaveBeenCalledWith({ value: 123 });
    });

    it('should not trigger callbacks for different channels', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribe('channel1', callback1);
      service.subscribe('channel2', callback2);

      service.broadcast('channel1', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle broadcasting without subscribers', () => {
      expect(() => {
        service.broadcast('empty-channel', { data: 'test' });
      }).not.toThrow();
    });

    it('should generate unique listener IDs', () => {
      const id1 = service.subscribe('channel', vi.fn());
      const id2 = service.subscribe('channel', vi.fn());
      const id3 = service.subscribe('channel', vi.fn());

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should handle errors in callbacks', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      service.subscribe('test-channel', errorCallback);
      service.subscribe('test-channel', normalCallback);

      service.broadcast('test-channel', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors when broadcasting (postMessage fails)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a channel that will fail when postMessage is called
      service.subscribe('error-channel', vi.fn());

      // Mock postMessage to throw an error
      const channel = (service as any).channels.get('error-channel');
      const originalPostMessage = channel.postMessage;
      channel.postMessage = vi.fn(() => {
        throw new Error('postMessage failed');
      });

      // This should not throw, but should log an error
      expect(() => {
        service.broadcast('error-channel', { data: 'test' });
      }).not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error broadcasting to "error-channel":',
        expect.any(Error)
      );

      // Restore
      channel.postMessage = originalPostMessage;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe a specific listener', async () => {
      const callback = vi.fn();
      const listenerId = service.subscribe('test-channel', callback);

      service.broadcast('test-channel', { data: 'first' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1);

      service.unsubscribe('test-channel', listenerId);

      service.broadcast('test-channel', { data: 'second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should only unsubscribe the specified listener', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const id1 = service.subscribe('test-channel', callback1);
      service.subscribe('test-channel', callback2);

      service.unsubscribe('test-channel', id1);

      service.broadcast('test-channel', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribing non-existent listener', () => {
      expect(() => {
        service.unsubscribe('test-channel', 'non-existent-id');
      }).not.toThrow();
    });

    it('should handle unsubscribing from non-existent channel', () => {
      expect(() => {
        service.unsubscribe('non-existent-channel', 'listener_1');
      }).not.toThrow();
    });
  });

  describe('close', () => {
    it('should close a specific channel', async () => {
      const callback = vi.fn();

      service.subscribe('test-channel', callback);
      service.close('test-channel');

      // Note: broadcast creates a new channel if it doesn't exist
      // So we just verify that the callback isn't called
      service.broadcast('test-channel', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not affect other channels', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribe('channel1', callback1);
      service.subscribe('channel2', callback2);

      service.close('channel1');

      service.broadcast('channel1', { data: 'test' });
      service.broadcast('channel2', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle closing non-existent channel', () => {
      expect(() => {
        service.close('non-existent-channel');
      }).not.toThrow();
    });
  });

  describe('closeAll', () => {
    it('should close all channels', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      service.subscribe('channel1', callback1);
      service.subscribe('channel2', callback2);
      service.subscribe('channel3', callback3);

      service.closeAll();

      service.broadcast('channel1', { data: 'test' });
      service.broadcast('channel2', { data: 'test' });
      service.broadcast('channel3', { data: 'test' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Callbacks should not have been called
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
      // Note: broadcast() creates new channels, so we don't check channel count
    });
  });

  describe('getActiveChannels', () => {
    it('should return all active channel names', () => {
      expect(service.getActiveChannels()).toHaveLength(0);

      service.subscribe('channel1', vi.fn());
      service.subscribe('channel2', vi.fn());
      service.subscribe('channel3', vi.fn());

      const channels = service.getActiveChannels();
      expect(channels).toHaveLength(3);
      expect(channels).toContain('channel1');
      expect(channels).toContain('channel2');
      expect(channels).toContain('channel3');
    });

    it('should include channels created by broadcast', () => {
      service.broadcast('new-channel', { data: 'test' });

      const channels = service.getActiveChannels();
      expect(channels).toContain('new-channel');
    });

    it('should not include closed channels', () => {
      service.subscribe('test-channel', vi.fn());
      expect(service.getActiveChannels()).toContain('test-channel');

      service.close('test-channel');
      expect(service.getActiveChannels()).not.toContain('test-channel');
    });
  });

  describe('isChannelActive', () => {
    it('should return true for active channels', () => {
      service.subscribe('test-channel', vi.fn());
      expect(service.isChannelActive('test-channel')).toBe(true);
    });

    it('should return false for inactive channels', () => {
      expect(service.isChannelActive('non-existent')).toBe(false);
    });

    it('should return false after closing a channel', () => {
      service.subscribe('test-channel', vi.fn());
      expect(service.isChannelActive('test-channel')).toBe(true);

      service.close('test-channel');
      expect(service.isChannelActive('test-channel')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle broadcasting undefined data', async () => {
      const callback = vi.fn();
      service.subscribe('test-channel', callback);

      service.broadcast('test-channel', undefined);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // BroadcastChannel may convert undefined to null
      expect(callback).toHaveBeenCalled();
    });

    it('should handle broadcasting null data', async () => {
      const callback = vi.fn();
      service.subscribe('test-channel', callback);

      service.broadcast('test-channel', null);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should handle broadcasting without data parameter', async () => {
      const callback = vi.fn();
      service.subscribe('test-channel', callback);

      service.broadcast('test-channel');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // BroadcastChannel may convert undefined to null
      expect(callback).toHaveBeenCalled();
    });

    it('should handle multiple broadcasts in rapid succession', async () => {
      const callback = vi.fn();
      service.subscribe('test-channel', callback);

      for (let i = 0; i < 10; i++) {
        service.broadcast('test-channel', { count: i });
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(callback).toHaveBeenCalledTimes(10);
    });

    it('should handle resubscribing after unsubscribe', async () => {
      const callback = vi.fn();

      const id1 = service.subscribe('test-channel', callback);
      service.unsubscribe('test-channel', id1);

      const id2 = service.subscribe('test-channel', callback);

      service.broadcast('test-channel', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Data types', () => {
    it('should handle different data types', async () => {
      const callback = vi.fn();
      service.subscribe('test-channel', callback);

      const testData = [
        'string data',
        42,
        { key: 'value', nested: { data: true } },
        [1, 2, 3, 4, 5],
        true,
        false,
      ];

      for (const data of testData) {
        service.broadcast('test-channel', data);
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(callback).toHaveBeenCalledTimes(testData.length);
      testData.forEach((data, index) => {
        expect(callback).toHaveBeenNthCalledWith(index + 1, data);
      });
    });
  });
});
