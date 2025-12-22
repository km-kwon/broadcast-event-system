import type { IBroadcastService } from '../types/events';

/**
 * Service for cross-window/tab communication using BroadcastChannel API
 * Allows different windows/tabs of the same origin to communicate
 */
export class BroadcastService implements IBroadcastService {
  private channels = new Map<string, BroadcastChannel>();
  private listeners = new Map<string, Map<string, (event: MessageEvent) => void>>();
  private listenerIdCounter = 0;

  /**
   * Subscribe to a broadcast channel
   * @param channelName - The name of the channel to subscribe to
   * @param callback - Function to call when a message is received
   * @returns Listener ID that can be used to unsubscribe
   */
  subscribe(channelName: string, callback: (data: any) => void): string {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new BroadcastChannel(channelName));
      this.listeners.set(channelName, new Map());
    }

    const channel = this.channels.get(channelName)!;
    const listenerId = `listener_${++this.listenerIdCounter}`;

    const messageHandler = (event: MessageEvent) => {
      try {
        callback(event.data);
      } catch (error) {
        console.error(`Error in broadcast callback for "${channelName}":`, error);
      }
    };

    channel.addEventListener('message', messageHandler);
    this.listeners.get(channelName)!.set(listenerId, messageHandler);

    return listenerId;
  }

  /**
   * Unsubscribe a specific listener from a broadcast channel
   * @param channelName - The name of the channel
   * @param listenerId - The ID of the listener to remove
   */
  unsubscribe(channelName: string, listenerId: string): void {
    const channel = this.channels.get(channelName);
    const listeners = this.listeners.get(channelName);

    if (channel && listeners) {
      const messageHandler = listeners.get(listenerId);
      if (messageHandler) {
        channel.removeEventListener('message', messageHandler);
        listeners.delete(listenerId);
      }
    }
  }

  /**
   * Broadcast data to all subscribers of a channel
   * @param channelName - The name of the channel to broadcast to
   * @param data - The data to broadcast
   */
  broadcast(channelName: string, data?: any): void {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new BroadcastChannel(channelName));
    }

    try {
      this.channels.get(channelName)!.postMessage(data);
    } catch (error) {
      console.error(`Error broadcasting to "${channelName}":`, error);
    }
  }

  /**
   * Close a specific channel and remove all listeners
   * @param channelName - The name of the channel to close
   */
  close(channelName: string): void {
    const channel = this.channels.get(channelName);
    const listeners = this.listeners.get(channelName);

    if (channel && listeners) {
      // Remove all event listeners
      listeners.forEach((listener) => {
        channel.removeEventListener('message', listener);
      });

      channel.close();
      this.channels.delete(channelName);
      this.listeners.delete(channelName);
    }
  }

  /**
   * Close all channels and remove all listeners
   */
  closeAll(): void {
    this.channels.forEach((channel, channelName) => {
      const listeners = this.listeners.get(channelName);
      if (listeners) {
        listeners.forEach((listener) => {
          channel.removeEventListener('message', listener);
        });
      }
      channel.close();
    });
    this.channels.clear();
    this.listeners.clear();
  }

  /**
   * Get all active channel names
   * @returns An array of channel names that are currently active
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is active
   * @param channelName - The name of the channel to check
   * @returns True if the channel is active, false otherwise
   */
  isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

/**
 * Singleton instance of BroadcastService
 * Use this for shared cross-window/tab communication across your application
 */
export const broadcastService = new BroadcastService();
