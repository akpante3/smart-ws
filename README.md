# smart-ws ⭐

A **resilient**, **type-safe** WebSocket client with auto-reconnect, heartbeat, offline buffering, and lifecycle events.

A lightweight, drop-in replacement for the native WebSocket API — designed for **production-grade** real-time applications.

---

## 🔗 Links

| Resource | Link |
| :--- | :--- |
| **📦 npm** | https://www.npmjs.com/package/smart-ws |
| **💻 GitHub** | https://github.com/your-username/smart-ws |
| **🌐 Live Demo** | https://your-demo-link.com |

---

## 🚀 Introduction

**smart-ws** is a fully-featured WebSocket client that fixes the biggest problems developers face when working with real-time connections:

* WebSockets disconnect unexpectedly
* Heartbeat logic must be manually implemented
* Reconnection logic is repetitive
* Offline mode breaks apps
* Messages sent while disconnected get lost
* No simple way to track connection status, retries, or latency
* No type safety for incoming/outgoing messages

**smart-ws** solves all of these problems with a modern, minimal, **TypeScript-first** API.

If you’ve ever written code like this:

```javascript
const ws = new WebSocket(url);

ws.onclose = () => {
  setTimeout(() => {
    ws = new WebSocket(url);
  }, 1000);
};

This library replaces all of the above with a single clean implementation.

Here is the complete and polished README.md in Markdown format.

Markdown

# smart-ws ⭐

A **resilient**, **type-safe** WebSocket client with auto-reconnect, heartbeat, offline buffering, and lifecycle events.

A lightweight, drop-in replacement for the native WebSocket API — designed for **production-grade** real-time applications.

---

## 🔗 Links

| Resource | Link |
| :--- | :--- |
| **📦 npm** | https://www.npmjs.com/package/smart-ws |
| **💻 GitHub** | https://github.com/your-username/smart-ws |
| ** Front End: Demo** | https://github.com/akpante3/FE-smart-ws-demo
| ** Server: Demo** | https://github.com/akpante3/smart-ws-test-server

Clone the Front End and server side to see Demo


---

## 🚀 Introduction

**smart-ws** is a fully-featured WebSocket client that fixes the biggest problems developers face when working with real-time connections:

* WebSockets disconnect unexpectedly
* Heartbeat logic must be manually implemented
* Reconnection logic is repetitive
* Offline mode breaks apps
* Messages sent while disconnected get lost
* No simple way to track connection status, retries, or latency
* No type safety for incoming/outgoing messages

**smart-ws** solves all of these problems with a modern, minimal, **TypeScript-first** API.

If you’ve ever written code like this:

```javascript
const ws = new WebSocket(url);

ws.onclose = () => {
  setTimeout(() => {
    ws = new WebSocket(url);
  }, 1000);
};
```
This library replaces all of the above with a single clean implementation.

## 🌟 Features

✔ Automatic Reconnect (with exponential backoff)
Configurable options include:

Retry limits

Min/max delays

Exponential growth factor

Jitter to prevent reconnection storms

✔ Heartbeat / Ping-Pong Detection
Prevents silent disconnections and detects dead connections. Tracks:

Latency (ms)

Last ping timestamp

Last pong timestamp

✔ Offline Queue / Message Buffer
When disconnected (or offline):

Outbound messages are buffered

Buffer is replayed on reconnect

Queue size limits & drop strategies supported

✔ Full Lifecycle Events
Listen to everything from connection status to buffering:

open, message, close, error, reconnect, ping, pong, online, offline, bufferAdd, bufferFlush.

✔ Type-Safe API (TypeScript)
Define exactly what your app sends/receives:


```typescript
type Inbound = { type: "chat"; text: string; user: string; timestamp: number };
type Outbound = { type: "chat"; text: string; user: string };
```

No more guessing or manual type-casting.

## ✔ Works in Browser & Node.js
Node support via a simple constructor option: createWebSocket: (url) => new WebSocket(url).

✔ Tiny, dependency-free, production-tested

## 🧠 Why this library exists
In almost every real-time system (chat, trading dashboards, multiplayer apps, IoT dashboards), developers copy-paste the same fragile logic:

* manual reconnect

* setInterval pings

* random JSON parsing

* buffering messages

* browser offline detection

smart-ws provides a reusable, reliable engine so your application code stays clean and focused on business logic.

## 🏗 Architecture Overview

SmartSocket
│
├── Connection Manager  
│     - open/close lifecycle  
│     - WebSocket constructor wrapper  
│
├── Reconnect Manager  
│     - exponential backoff  
│     - jitter  
│     - retry counting  
│
├── Heartbeat Manager  
│     - ping interval  
│     - pong timeout  
│     - latency calculation  
│
├── Buffer Manager  
│     - offline queue  
│     - flush on reconnect  
│
└── EventEmitter  
      - on/off/emit  
      - lifecycle events  


## 📦 Installation
```bash
# npm
npm install smart-ws
```
```bash
# yarn
yarn add smart-ws
```
```bash
# pnpm
pnpm add smart-ws
```

## 🎉 Quick Start

If you don't want to define strict message types yet, you can make your WebSocket fully flexible by using:


smart-ws does not care what your message looks like.(Inbound, Outbound)

You can send:

* strings

* numbers

* objects

* arrays

* any JSON structure

* multiple message types

* commands, actions, events, payloads

* completely custom protocols

```typescript

import SmartSocket from "smart-ws";

// Allow any shape of inbound/outbound message
type Inbound = any;
type Outbound = any;

const ws = new SmartSocket<Inbound, Outbound>("ws://localhost:8080", {
  reconnect: {
    minDelay: 500,
    maxDelay: 8000,
    factor: 2,
    jitter: 0.2,
  },
  heartbeat: {
    interval: 30000,
    timeout: 5000,
    message: "ping",  // or any custom object
  },
  json: true          // ensures objects are auto-JSON encoded/decoded
});

// Listen for connection events
ws.on("open", () => console.log("Connected"));
ws.on("close", () => console.log("Disconnected"));
ws.on("reconnect", (attempt) => console.log("Reconnecting… attempt:", attempt));

// Listen for messages (any shape)
ws.on("message", (data) => {
  console.log("Incoming:", data);
});

// Send any JSON value
ws.send({
  event: "hello",
  payload: { text: "Hello from smart-ws!" }
});

```

## ⚙️ Configuration Options


| Export           | Description                                         |
| ---------------- | --------------------------------------------------- |
| `Option`         | Controls automatic re-connect behavior              |
| `heartbeat`      | Ping-pong settings for detecting dead connections   |
| `buffer`         | Offline message queue settings.                     |
| `json`           | Enable/disable automatic JSON.stringify JSON parse. |
| `createWebSocket`| Required in Node.js to provide the WebSocket implementation. |


## Reconnect

Controls automatic re-connect behavior (exponential backoff with jitter).

``` typescript 
    {
        retries: Infinity,   // how many times to retry (Infinity recommended)
        minDelay: 500,       // initial delay (ms)
        maxDelay: 15000,     // maximum delay (ms)
        factor: 2,           // exponential factor
        jitter: 0.2          // +/- 20% random variance
    }
```

## Heartbeat

Configuration for the ping-pong mechanism.

``` typescript
    {
        interval: 25000,     // send ping every 25s (ms)
        timeout: 5000,       // wait 5s for a pong (ms)
        message: "ping",     // or your custom object if json: true
        enabled: true
    }
```

## Buffer (offline queue)

``` javascript
{
  enabled: true,
  max: 200,              // max stored messages
  dropStrategy: "oldest" // drop "oldest" when full (or "newest")
}
```

## CreateWebSocket (Node.js Support)

Required in Node.js environments to supply a WebSocket implementation (e.g., the ws library).

``` typescript
import WS from "ws";

const ws = new SmartSocket(url, {
  createWebSocket: (url) => new WS(url)
});
```

## 🧩 Full Event API

Listen to lifecycle events using `ws.on(event, handler)`.

| Event | Description | Handler Signature |
| :--- | :--- | :--- |
| `open` | Connection opened successfully. | `() => void` |
| `close` | Closed by server or client. | `() => void` |
| `error` | WebSocket error occurred. | `(error: Event) => void` |
| `message` | Incoming message received. | `(msg: Inbound) => void` |
| `reconnect` | Reconnect attempt initiated. | `(attempt: number) => void` |
| `ping` | Heartbeat ping message sent. | `(latency: number) => void` |
| `pong` | Heartbeat pong message received. | `(latency: number) => void` |
| `online` | Browser regained internet (via `window.ononline`). | `() => void` |
| `offline` | Browser lost internet (via `window.onoffline`). | `() => void` |
| `bufferAdd` | Message added to the offline buffer. | `(message: Outbound) => void` |
| `bufferFlush` | Buffered messages are being sent upon reconnect. | `(count: number) => void` |


## 💡 Use Cases
`smart-ws` is ideal for any application that requires a robust, always-on connection:

* Real-time chat (Slack/Discord-style)

* Trading dashboards & Crypto tickers

* Multiplayer games

* IoT device monitoring

* Collaboration tools & Live analytics dashboards

* Push notification systems & Social feeds

* Background agents (Node.js)

## 💬 Example: Real-Time Group Chat
For a complete, working example using smart-ws in a group chat scenario:

Demo repository: 👉 https://github.com/your-username/smart-ws-demo

Live demo: 👉 https://your-demo-link.com



## 🔍 Runtime Status API

Access the current state of the connection at any time:

```javascript
ws.getStatus();     // string: "open", "closed", "connecting", "reconnecting", "error"
ws.getRetries();    // number: current reconnect attempt
ws.getLatency();    // number: last ping/pong latency (ms)
ws.getLastPing();   // number: timestamp of last ping
ws.getLastPong();   // number: timestamp of last pong
```

## 💼 Production Tips

* Always enable heartbeat in production to prevent silent disconnections.

* Prefer json: true for clarity, type safety, and automatic parsing.

* Set a meaningful maxDelay for reconnect (e.g., 15-60 seconds) to avoid stressing the server.

* Use buffer.max to prevent potential memory leaks in long-running offline scenarios.

* Track reconnect attempts and getStatus() for UI visibility to inform the user.

## 🛠 Development / Contributing

``` javascript
# Build (compiles TypeScript to JS)
npm run build

# Watch mode (for development)
npm run dev

# Publish to npm
npm publish --access public
```
Pull requests are welcome! Feel free to open an issue to discuss major changes.

## 📄 License
MIT © 2025 Victor Obije
