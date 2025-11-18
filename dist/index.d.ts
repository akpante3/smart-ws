type ReconnectOptions = {
    retries?: number;
    minDelay?: number;
    maxDelay?: number;
    factor?: number;
    jitter?: number;
};
type HeartbeatOptions<TOut> = {
    interval?: number;
    timeout?: number;
    message?: TOut;
    enabled?: boolean;
};
type BufferOptions<TOut> = {
    enabled?: boolean;
    max?: number;
    dropStrategy?: "oldest" | "newest";
};
type SmartWsStatus = "idle" | "connecting" | "open" | "closing" | "closed" | "reconnecting";
type SmartWsEvents<TIn, TOut> = {
    open: [];
    close: [CloseEvent | {
        code?: number;
        reason?: string;
    }];
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
type SmartWsOptions<TIn, TOut> = {
    reconnect?: ReconnectOptions;
    heartbeat?: HeartbeatOptions<TOut>;
    buffer?: BufferOptions<TOut>;
    json?: boolean;
    createWebSocket?: (url: string) => WebSocket;
};

declare class SmartSocket<TIn = any, TOut = any> {
    private url;
    private ws;
    private options;
    private emitter;
    private status;
    private retries;
    private backoff;
    private buffer;
    private heartbeatTimer;
    private heartbeatTimeoutTimer;
    private lastPing?;
    private lastPong?;
    private latencyMs?;
    private closedManually;
    constructor(url: string, options?: SmartWsOptions<TIn, TOut>);
    getStatus(): SmartWsStatus;
    getRetries(): number;
    getLatency(): number | undefined;
    getLastPing(): number | undefined;
    getLastPong(): number | undefined;
    on: <K extends keyof SmartWsEvents<TIn, TOut>>(event: K, handler: (...args: SmartWsEvents<TIn, TOut>[K]) => void) => () => void;
    off: <K extends keyof SmartWsEvents<TIn, TOut>>(event: K, handler: (...args: SmartWsEvents<TIn, TOut>[K]) => void) => void;
    send(message: TOut): void;
    connect(): void;
    disconnect(code?: number, reason?: string): void;
    private createWebSocket;
    private _sendNow;
    private bufferMessage;
    private flushBuffer;
    private scheduleReconnect;
    private startHeartbeat;
    private clearHeartbeat;
    private setupOnlineOfflineListeners;
}

export { type BufferOptions, type HeartbeatOptions, type ReconnectOptions, SmartSocket, type SmartWsEvents, type SmartWsOptions, type SmartWsStatus, SmartSocket as default };
