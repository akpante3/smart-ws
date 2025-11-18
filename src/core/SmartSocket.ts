import { EventEmitter } from "./EventEmitter";
import { createBackoff } from "./backoff";
import type {
    SmartWsOptions,
    SmartWsEvents,
    SmartWsStatus,
    ReconnectOptions,
} from "./types";

const isBrowser = typeof window !== "undefined";

export class SmartSocket<TIn = any, TOut = any> {
    private url: string;
    private ws: WebSocket | null = null;
    private options: SmartWsOptions<TIn, TOut>;
    private emitter = new EventEmitter<SmartWsEvents<TIn, TOut>>();

    private status: SmartWsStatus = "idle";
    private retries = 0;
    private backoff: ReturnType<typeof createBackoff>;
    private buffer: TOut[] = [];

    private heartbeatTimer: any = null;
    private heartbeatTimeoutTimer: any = null;
    private lastPing?: number;
    private lastPong?: number;
    private latencyMs?: number;
    private closedManually = false;

    constructor(url: string, options: SmartWsOptions<TIn, TOut> = {}) {
        this.url = url;
        this.options = options;
        this.backoff = createBackoff(options.reconnect ?? {});
        this.setupOnlineOfflineListeners();
        this.connect();
    }

    getStatus(): SmartWsStatus {
        return this.status;
    }

    getRetries(): number {
        return this.retries;
    }

    getLatency(): number | undefined {
        return this.latencyMs;
    }

    getLastPing(): number | undefined {
        return this.lastPing;
    }

    getLastPong(): number | undefined {
        return this.lastPong;
    }

    on = this.emitter.on.bind(this.emitter);
    off = this.emitter.off.bind(this.emitter);

    send(message: TOut) {
        if (this.status === "open" && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this._sendNow(message);
        } else if (this.options.buffer?.enabled !== false) {
            this.bufferMessage(message);
        }
    }

    connect() {
        this.closedManually = false;
        this.createWebSocket();
    }

    disconnect(code?: number, reason?: string) {
        this.closedManually = true;
        this.status = "closing";
        this.clearHeartbeat();
        if (this.ws) this.ws.close(code, reason);
    }
    private createWebSocket() {
        if (!isBrowser && !this.options.createWebSocket) {
            throw new Error("SmartSocket: in Node provide options.createWebSocket");
        }

        this.status = this.status === "idle" ? "connecting" : "reconnecting";

        const wsCtor =
            (this.options.createWebSocket as any) ||
            (isBrowser ? WebSocket : undefined);

        if (!wsCtor) {
            throw new Error("SmartSocket: no WebSocket constructor available");
        }

        const ws: WebSocket = new wsCtor(this.url);
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
            const data = this.options.json
                ? (JSON.parse(event.data) as TIn)
                : (event.data as unknown as TIn);

            // naive pong detection: assume server responds quickly
            if (this.options.heartbeat?.enabled !== false && this.lastPing) {
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

    private _sendNow(message: TOut) {
        if (!this.ws) return;
        const payload = this.options.json ? JSON.stringify(message) : (message as any);
        this.ws.send(payload);
    }

    private bufferMessage(message: TOut) {
        const max = this.options.buffer?.max ?? 200;
        const strategy = this.options.buffer?.dropStrategy ?? "oldest";
        if (this.buffer.length >= max) {
            if (strategy === "oldest") this.buffer.shift();
            else return; // drop newest
        }
        this.buffer.push(message);
        this.emitter.emit("bufferAdd", message);
    }

    private flushBuffer() {
        if (!this.buffer.length) return;
        const toFlush = [...this.buffer];
        this.buffer = [];
        for (const msg of toFlush) this._sendNow(msg);
        this.emitter.emit("bufferFlush", toFlush);
    }

    private scheduleReconnect() {
        const reconnectOpts: ReconnectOptions = this.options.reconnect ?? {};
        const maxRetries = reconnectOpts.retries ?? Infinity;

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

    private startHeartbeat() {
        const hb = this.options.heartbeat;
        if (!hb || hb.enabled === false) return;

        const interval = hb.interval ?? 25_000;
        const timeout = hb.timeout ?? 5_000;
        const pingMessage = hb.message as TOut | undefined;

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
                // no pong detected in time → force close
                this.ws?.close(4000, "Heartbeat timeout");
            }, timeout);
        }, interval);
    }

    private clearHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (this.heartbeatTimeoutTimer) {
            clearTimeout(this.heartbeatTimeoutTimer);
            this.heartbeatTimeoutTimer = null;
        }
    }
    private setupOnlineOfflineListeners() {
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
}

