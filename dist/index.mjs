// src/core/EventEmitter.ts
var EventEmitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  on(event, handler) {
    let set = this.listeners.get(event);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }
  off(event, handler) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(handler);
  }
  emit(event, ...args) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(...args);
    }
  }
  removeAllListeners() {
    this.listeners.clear();
  }
};

// src/core/backoff.ts
function createBackoff(opts) {
  const {
    minDelay = 500,
    maxDelay = 2e4,
    factor = 2,
    jitter = 0.2
  } = opts;
  let attempt = 0;
  function nextDelay() {
    const exp = minDelay * Math.pow(factor, attempt);
    const base = Math.min(exp, maxDelay);
    const jitterAmount = base * jitter;
    const random = (Math.random() * 2 - 1) * jitterAmount;
    attempt += 1;
    return Math.max(0, base + random);
  }
  function reset() {
    attempt = 0;
  }
  return { nextDelay, reset };
}

// src/core/SmartSocket.ts
var isBrowser = typeof window !== "undefined";
var SmartSocket = class {
  constructor(url, options = {}) {
    this.ws = null;
    this.emitter = new EventEmitter();
    this.status = "idle";
    this.retries = 0;
    this.buffer = [];
    this.heartbeatTimer = null;
    this.heartbeatTimeoutTimer = null;
    this.closedManually = false;
    this.on = this.emitter.on.bind(this.emitter);
    this.off = this.emitter.off.bind(this.emitter);
    var _a;
    this.url = url;
    this.options = options;
    this.backoff = createBackoff((_a = options.reconnect) != null ? _a : {});
    this.setupOnlineOfflineListeners();
    this.connect();
  }
  getStatus() {
    return this.status;
  }
  getRetries() {
    return this.retries;
  }
  getLatency() {
    return this.latencyMs;
  }
  getLastPing() {
    return this.lastPing;
  }
  getLastPong() {
    return this.lastPong;
  }
  send(message) {
    var _a;
    if (this.status === "open" && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendNow(message);
    } else if (((_a = this.options.buffer) == null ? void 0 : _a.enabled) !== false) {
      this.bufferMessage(message);
    }
  }
  connect() {
    this.closedManually = false;
    this.createWebSocket();
  }
  disconnect(code, reason) {
    this.closedManually = true;
    this.status = "closing";
    this.clearHeartbeat();
    if (this.ws) this.ws.close(code, reason);
  }
  createWebSocket() {
    if (!isBrowser && !this.options.createWebSocket) {
      throw new Error("SmartSocket: in Node provide options.createWebSocket");
    }
    this.status = this.status === "idle" ? "connecting" : "reconnecting";
    const wsCtor = this.options.createWebSocket || (isBrowser ? WebSocket : void 0);
    if (!wsCtor) {
      throw new Error("SmartSocket: no WebSocket constructor available");
    }
    const ws = new wsCtor(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.status = "open";
      this.retries = 0;
      this.backoff.reset();
      this.emitter.emit("open");
      this.startHeartbeat();
      this.flushBuffer();
    };
    ws.onmessage = (event) => {
      var _a;
      const data = this.options.json ? JSON.parse(event.data) : event.data;
      if (((_a = this.options.heartbeat) == null ? void 0 : _a.enabled) !== false && this.lastPing) {
        const now = Date.now();
        this.lastPong = now;
        this.latencyMs = now - this.lastPing;
        this.emitter.emit("pong");
      }
      this.emitter.emit("message", data);
    };
    ws.onerror = (event) => {
      this.emitter.emit("error", event);
    };
    ws.onclose = (event) => {
      this.clearHeartbeat();
      this.emitter.emit("close", event);
      if (this.closedManually) {
        this.status = "closed";
        return;
      }
      this.scheduleReconnect();
    };
  }
  _sendNow(message) {
    if (!this.ws) return;
    const payload = this.options.json ? JSON.stringify(message) : message;
    this.ws.send(payload);
  }
  bufferMessage(message) {
    var _a, _b, _c, _d;
    const max = (_b = (_a = this.options.buffer) == null ? void 0 : _a.max) != null ? _b : 200;
    const strategy = (_d = (_c = this.options.buffer) == null ? void 0 : _c.dropStrategy) != null ? _d : "oldest";
    if (this.buffer.length >= max) {
      if (strategy === "oldest") this.buffer.shift();
      else return;
    }
    this.buffer.push(message);
    this.emitter.emit("bufferAdd", message);
  }
  flushBuffer() {
    if (!this.buffer.length) return;
    const toFlush = [...this.buffer];
    this.buffer = [];
    for (const msg of toFlush) this._sendNow(msg);
    this.emitter.emit("bufferFlush", toFlush);
  }
  scheduleReconnect() {
    var _a, _b;
    const reconnectOpts = (_a = this.options.reconnect) != null ? _a : {};
    const maxRetries = (_b = reconnectOpts.retries) != null ? _b : Infinity;
    if (this.retries >= maxRetries) {
      this.status = "closed";
      return;
    }
    this.retries += 1;
    const delay = this.backoff.nextDelay();
    this.emitter.emit("reconnect", this.retries);
    setTimeout(() => {
      this.createWebSocket();
    }, delay);
  }
  startHeartbeat() {
    var _a, _b;
    const hb = this.options.heartbeat;
    if (!hb || hb.enabled === false) return;
    const interval = (_a = hb.interval) != null ? _a : 25e3;
    const timeout = (_b = hb.timeout) != null ? _b : 5e3;
    const pingMessage = hb.message;
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.lastPing = Date.now();
      this.emitter.emit("ping");
      if (pingMessage) this._sendNow(pingMessage);
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
      }
      this.heartbeatTimeoutTimer = setTimeout(() => {
        var _a2;
        (_a2 = this.ws) == null ? void 0 : _a2.close(4e3, "Heartbeat timeout");
      }, timeout);
    }, interval);
  }
  clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
  setupOnlineOfflineListeners() {
    if (!isBrowser || typeof window.addEventListener !== "function") return;
    window.addEventListener("online", () => {
      this.emitter.emit("online");
      if (this.status === "closed" || this.status === "reconnecting") {
        this.connect();
      }
    });
    window.addEventListener("offline", () => {
      this.emitter.emit("offline");
      if (this.ws) this.ws.close(4001, "Offline");
    });
  }
};

// src/index.ts
var index_default = SmartSocket;
export {
  SmartSocket,
  index_default as default
};
//# sourceMappingURL=index.mjs.map