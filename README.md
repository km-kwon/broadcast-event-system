# broadcast-event-system

Type-safe event bus and broadcast service for React applications. Pure TypeScript implementation with zero dependencies (except React for hooks).

## Features

- 🎯 **Type-safe**: Full TypeScript support with generics
- 🪶 **Lightweight**: No dependencies (React as peer dependency for hooks)
- 🔄 **Event Bus**: In-app event communication
- 📡 **Broadcast**: Cross-window/tab communication
- ⚛️ **React Hooks**: Easy integration with React components
- 🧹 **Auto Cleanup**: Automatic event listener cleanup on unmount

## Installation

```bash
npm install broadcast-event-system
# or
yarn add broadcast-event-system
# or
pnpm add broadcast-event-system
```

## Quick Start

### Event Bus (In-App Communication)

```tsx
import { useEventEmit, useEventOn } from 'broadcast-event-system';

// Define your event type
type CounterEvent = { count: number };

// Component that emits events
function CounterButton() {
  const emit = useEventEmit();

  const handleClick = () => {
    emit<CounterEvent>('counter:increment', { count: 1 });
  };

  return <button onClick={handleClick}>Increment</button>;
}

// Component that listens to events
function CounterDisplay() {
  useEventOn<CounterEvent>('counter:increment', (data) => {
    console.log('Counter incremented:', data.count);
  });

  return <div>Listening to counter events</div>;
}
```

### Broadcast (Cross-Window Communication)

```tsx
import { useBroadcast, useBroadcastOn } from 'broadcast-event-system';

// Send messages to other windows/tabs
function Sender() {
  const broadcast = useBroadcast();

  const handleClick = () => {
    broadcast('my-channel', { message: 'Hello from another tab!' });
  };

  return <button onClick={handleClick}>Send to Other Tabs</button>;
}

// Receive messages from other windows/tabs
function Receiver() {
  useBroadcastOn('my-channel', (data) => {
    console.log('Received:', data);
  });

  return <div>Listening to other tabs</div>;
}
```

## API Reference

### React Hooks

#### `useEventEmit(service?)`

Returns a function to emit events.

```tsx
const emit = useEventEmit();
emit<MyEventType>('event-name', { data: 'value' });
```

#### `useEventOn<T>(eventType, callback, service?)`

Subscribe to an event. Automatically unsubscribes on unmount.

```tsx
useEventOn<MyEventType>('event-name', (data) => {
  console.log('Received:', data);
});
```

#### `useEventState<T>(eventType, initialState, service?)`

Combines event subscription with state management.

```tsx
type UserEvent = { name: string; age: number };

function UserProfile() {
  const user = useEventState<UserEvent>('user:updated', { name: '', age: 0 });

  return <div>{user.name} is {user.age} years old</div>;
}
```

#### `useBroadcast(service?)`

Returns a function to broadcast messages to other windows/tabs.

```tsx
const broadcast = useBroadcast();
broadcast('channel-name', { data: 'value' });
```

#### `useBroadcastOn(channelName, callback, service?)`

Subscribe to broadcast messages from other windows/tabs.

```tsx
useBroadcastOn('channel-name', (data) => {
  console.log('Received from another tab:', data);
});
```

### Core Services

#### `EventService`

```typescript
import { EventService, eventService } from 'broadcast-event-system/core';

// Use singleton instance
eventService.emit('event-name', { data: 'value' });
eventService.on('event-name', (payload) => console.log(payload));
eventService.off('event-name', listener);
eventService.clear('event-name');
eventService.clearAll();

// Or create your own instance
const myEvents = new EventService();
```

#### `BroadcastService`

```typescript
import { BroadcastService, broadcastService } from 'broadcast-event-system/core';

// Use singleton instance
const listenerId = broadcastService.subscribe('channel', (data) => {
  console.log('Received:', data);
});

broadcastService.broadcast('channel', { message: 'Hello' });

// Cleanup - unsubscribe specific listener
broadcastService.unsubscribe('channel', listenerId);

// Or close entire channel (removes all listeners)
broadcastService.close('channel');

// Close all channels
broadcastService.closeAll();

// Or create your own instance
const myBroadcast = new BroadcastService();
```

## Advanced Usage

### Custom Event Service Instance

```tsx
import { EventService } from 'broadcast-event-system/core';
import { useEventEmit, useEventOn } from 'broadcast-event-system';

// Create a custom instance for isolated event bus
const customEvents = new EventService();

function MyComponent() {
  const emit = useEventEmit(customEvents);

  useEventOn('my-event', (data) => {
    console.log(data);
  }, customEvents);

  // This event is isolated from the global event bus
  return <button onClick={() => emit('my-event', { test: true })}>Click</button>;
}
```

### Event Naming Conventions

We recommend using namespaced event names:

```typescript
// Good
'user:login'
'user:logout'
'cart:add-item'
'cart:remove-item'
'notification:show'

// Avoid
'login'
'addItem'
'show'
```

### TypeScript Best Practices

Define event types for better type safety:

```typescript
// events.types.ts
export type UserLoginEvent = {
  userId: string;
  timestamp: number;
};

export type CartAddItemEvent = {
  itemId: string;
  quantity: number;
};

// In your component
import { useEventEmit } from 'broadcast-event-system';
import type { UserLoginEvent } from './events.types';

const emit = useEventEmit();
emit<UserLoginEvent>('user:login', {
  userId: '123',
  timestamp: Date.now(),
});
```

## Real-World Example

```tsx
// EventTypes.ts
export type NotificationEvent = {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
};

// NotificationManager.tsx
import { useEventOn } from 'broadcast-event-system';
import { NotificationEvent } from './EventTypes';

export function NotificationManager() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEventOn<NotificationEvent>('notification:show', (data) => {
    setNotifications((prev) => [...prev, data]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n !== data));
    }, data.duration || 3000);
  });

  return (
    <div className="notifications">
      {notifications.map((notif, idx) => (
        <div key={idx} className={`notification ${notif.type}`}>
          {notif.message}
        </div>
      ))}
    </div>
  );
}

// Anywhere in your app
import { useEventEmit } from 'broadcast-event-system';
import { NotificationEvent } from './EventTypes';

function MyForm() {
  const emit = useEventEmit();

  const handleSubmit = async () => {
    try {
      await saveData();
      emit<NotificationEvent>('notification:show', {
        type: 'success',
        message: 'Data saved successfully!',
      });
    } catch (error) {
      emit<NotificationEvent>('notification:show', {
        type: 'error',
        message: 'Failed to save data',
      });
    }
  };

  return <button onClick={handleSubmit}>Save</button>;
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
