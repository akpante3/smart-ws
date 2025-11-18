import type { ReconnectOptions } from "./types";

export function createBackoff(opts: ReconnectOptions) {
  const {
    minDelay = 500,
    maxDelay = 20_000,
    factor = 2,
    jitter = 0.2,
  } = opts;

  let attempt = 0;

  function nextDelay() {
    const exp = minDelay * Math.pow(factor, attempt);
    const base = Math.min(exp, maxDelay);
    const jitterAmount = base * jitter;
    const random = (Math.random() * 2 - 1) * jitterAmount; // ±jitterAmount
    attempt += 1;
    return Math.max(0, base + random);
  }

  function reset() {
    attempt = 0;
  }

  return { nextDelay, reset };
}
