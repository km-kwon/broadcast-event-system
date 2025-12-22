/**
 * Basic usage examples for broadcast-event-system
 */

import React, { useState } from 'react';
import {
  useEventEmit,
  useEventOn,
  useEventState,
  useBroadcast,
  useBroadcastOn,
} from '../src/index';

// ============================================================================
// Example 1: Simple Counter with Events
// ============================================================================

type CounterEvent = {
  count: number;
  timestamp: number;
};

function CounterEmitter() {
  const emit = useEventEmit();
  const [count, setCount] = useState(0);

  const increment = () => {
    const newCount = count + 1;
    setCount(newCount);
    emit<CounterEvent>('counter:changed', {
      count: newCount,
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      <h2>Counter Emitter</h2>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

function CounterListener() {
  const [lastUpdate, setLastUpdate] = useState<CounterEvent | null>(null);

  useEventOn<CounterEvent>('counter:changed', (data) => {
    console.log('Counter changed:', data);
    setLastUpdate(data);
  });

  return (
    <div>
      <h2>Counter Listener</h2>
      {lastUpdate ? (
        <p>
          Last count: {lastUpdate.count} at {new Date(lastUpdate.timestamp).toLocaleTimeString()}
        </p>
      ) : (
        <p>Waiting for updates...</p>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Using useEventState for Automatic State Updates
// ============================================================================

type UserEvent = {
  name: string;
  email: string;
  role: 'admin' | 'user';
};

function UserEditor() {
  const emit = useEventEmit();

  const handleLogin = () => {
    emit<UserEvent>('user:updated', {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
    });
  };

  const handleLogout = () => {
    emit<UserEvent>('user:updated', {
      name: '',
      email: '',
      role: 'user',
    });
  };

  return (
    <div>
      <h2>User Editor</h2>
      <button onClick={handleLogin}>Login as Admin</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

function UserProfile() {
  // Automatically updates when 'user:updated' event is emitted
  const user = useEventState<UserEvent>('user:updated', {
    name: '',
    email: '',
    role: 'user',
  });

  return (
    <div>
      <h2>User Profile</h2>
      <p>Name: {user.name || 'Not logged in'}</p>
      <p>Email: {user.email || 'N/A'}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}

// ============================================================================
// Example 3: Notification System
// ============================================================================

type NotificationEvent = {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
};

function NotificationManager() {
  const [notifications, setNotifications] = useState<(NotificationEvent & { id: number })[]>([]);

  useEventOn<NotificationEvent>('notification:show', (data) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { ...data, id }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, data.duration || 3000);
  });

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
      {notifications.map((notif) => (
        <div
          key={notif.id}
          style={{
            padding: '10px',
            margin: '5px',
            borderRadius: '4px',
            backgroundColor:
              notif.type === 'success'
                ? '#4caf50'
                : notif.type === 'error'
                  ? '#f44336'
                  : notif.type === 'warning'
                    ? '#ff9800'
                    : '#2196f3',
            color: 'white',
          }}
        >
          {notif.message}
        </div>
      ))}
    </div>
  );
}

function NotificationTrigger() {
  const emit = useEventEmit();

  const showSuccess = () => {
    emit<NotificationEvent>('notification:show', {
      type: 'success',
      message: 'Operation completed successfully!',
      duration: 3000,
    });
  };

  const showError = () => {
    emit<NotificationEvent>('notification:show', {
      type: 'error',
      message: 'Something went wrong!',
      duration: 5000,
    });
  };

  return (
    <div>
      <h2>Notification Trigger</h2>
      <button onClick={showSuccess}>Show Success</button>
      <button onClick={showError}>Show Error</button>
    </div>
  );
}

// ============================================================================
// Example 4: Cross-Tab Communication
// ============================================================================

type TabMessageEvent = {
  message: string;
  from: string;
  timestamp: number;
};

function TabSender() {
  const broadcast = useBroadcast();
  const [message, setMessage] = useState('');

  const send = () => {
    broadcast('tab-chat', {
      message,
      from: `Tab ${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
    } as TabMessageEvent);
    setMessage('');
  };

  return (
    <div>
      <h2>Send to Other Tabs</h2>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={send}>Send</button>
    </div>
  );
}

function TabReceiver() {
  const [messages, setMessages] = useState<TabMessageEvent[]>([]);

  useBroadcastOn('tab-chat', (data: TabMessageEvent) => {
    setMessages((prev) => [...prev, data].slice(-10)); // Keep last 10 messages
  });

  return (
    <div>
      <h2>Messages from Other Tabs</h2>
      {messages.length === 0 ? (
        <p>No messages yet. Open this page in another tab and send a message!</p>
      ) : (
        <ul>
          {messages.map((msg, idx) => (
            <li key={idx}>
              <strong>{msg.from}:</strong> {msg.message}{' '}
              <small>({new Date(msg.timestamp).toLocaleTimeString()})</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================

export function EventSystemExamples() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>@ccu2/event-system Examples</h1>

      <section style={{ marginBottom: '40px' }}>
        <h2>Example 1: Simple Counter</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <CounterEmitter />
          <CounterListener />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Example 2: User State with useEventState</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <UserEditor />
          <UserProfile />
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Example 3: Notification System</h2>
        <NotificationManager />
        <NotificationTrigger />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Example 4: Cross-Tab Communication</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <TabSender />
          <TabReceiver />
        </div>
        <p style={{ fontStyle: 'italic', color: '#666' }}>
          Open this page in multiple tabs to see cross-tab communication in action!
        </p>
      </section>
    </div>
  );
}

export default EventSystemExamples;
