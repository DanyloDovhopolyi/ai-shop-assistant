import { z } from "zod";

import { computeBackoff } from "./backoff";
import {
  AbortedError,
  type FetchError,
  HttpError,
  InvalidResponseError,
  NetworkError,
  TimeoutError,
} from "./errors";

export interface FetchJsonOptions {
  /** Caller cancellation. Aborting stops the request and any pending retry. */
  readonly signal?: AbortSignal | undefined;
  /** Per-attempt timeout. */
  readonly timeoutMs?: number;
  /** Extra attempts for idempotent requests on transient failures. */
  readonly retries?: number;
  /** Delay before retry number `attempt` (0-based). */
  readonly retryDelay?: (attempt: number) => number;
  readonly init?: Omit<RequestInit, "signal">;
}

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_RETRIES = 2;
const defaultRetryDelay = (attempt: number) =>
  computeBackoff(attempt, { baseMs: 200, maxMs: 2_000 });
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD"]);

/**
 * The single HTTP client: fetches JSON, validates it with `schema`, and throws
 * a typed `FetchError` on failure. Retries only idempotent requests on
 * transient failures (network, timeout, 5xx, 429).
 */
export async function fetchJson<Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  options: FetchJsonOptions = {},
): Promise<z.output<Schema>> {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelay = defaultRetryDelay,
    init = {},
  } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const retries = IDEMPOTENT_METHODS.has(method)
    ? (options.retries ?? DEFAULT_RETRIES)
    : 0;

  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptOnce(url, schema, { init, signal, timeoutMs });
    } catch (error) {
      if (attempt >= retries || !isTransient(error)) throw error;
      await wait(retryDelay(attempt), url, signal);
    }
  }
}

async function attemptOnce<Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  {
    init,
    signal,
    timeoutMs,
  }: { init: RequestInit; signal: AbortSignal | undefined; timeoutMs: number },
): Promise<z.output<Schema>> {
  if (signal?.aborted) throw new AbortedError(url);

  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let body: unknown;
  try {
    const response = await fetch(url, { ...init, signal: combined });
    if (!response.ok) throw new HttpError(url, response.status);
    body = await readJson(response, url);
  } catch (error) {
    if (error instanceof HttpError || error instanceof InvalidResponseError)
      throw error;
    if (signal?.aborted) throw new AbortedError(url);
    if (timeout.aborted) throw new TimeoutError(url, timeoutMs);
    throw new NetworkError(url, error);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new InvalidResponseError(
      url,
      z.prettifyError(parsed.error),
      parsed.error,
    );
  return parsed.data;
}

async function readJson(response: Response, url: string): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new InvalidResponseError(url, "Body is not valid JSON", error);
  }
}

function isTransient(error: unknown): error is FetchError {
  if (error instanceof NetworkError || error instanceof TimeoutError)
    return true;
  if (error instanceof HttpError)
    return error.status >= 500 || error.status === 429;
  return false;
}

function wait(
  ms: number,
  url: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortedError(url));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortedError(url));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
