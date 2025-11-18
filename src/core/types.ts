export type ReconnectOptions = {
    retries?: number;
    minDelay?: number;
    maxDelay?: number;
    factor?: number;
    jitter?: number;
  };
  
  export type HeartbeatOptions<TOut> = {
    interval?: number;
    timeout?: number;
    message?: TOut;
    enabled?: boolean;
  };
  
  export type BufferOptions<TOut> = {
    enabled?: boolean;
    max?: number;
    dropStrategy?: "oldest" | "newest";
  };
  
  export type SmartWsStatus =
    | "idle"
    | "connecting"
    | "open"
    | "closing"
    | "closed"
    | "reconnecting";
  
  export type SmartWsEvents<TIn, TOut> = {
    open: [];
    close: [CloseEvent | { code?: number; reason?: string }];
    error: [Event | Error];
    message: [TIn];
    reconnect: [number];
    online: [];
    offline: [];
    ping: [];
    pong: [];
    bufferAdd: [TOut];
    bufferFlush: [TOut[]];
  };
  
  export type SmartWsOptions<TIn, TOut> = {
    reconnect?: ReconnectOptions;
    heartbeat?: HeartbeatOptions<TOut>;
    buffer?: BufferOptions<TOut>;
    json?: boolean;
    createWebSocket?: (url: string) => WebSocket; // for Node support
  };
  