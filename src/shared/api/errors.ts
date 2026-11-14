import { AppError } from "@/shared/lib";

export class TimeoutError extends AppError {
  readonly kind = "timeout";

  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(`Request to ${url} timed out after ${String(timeoutMs)}ms`);
  }
}

export class AbortedError extends AppError {
  readonly kind = "aborted";

  constructor(readonly url: string) {
    super(`Request to ${url} was aborted`);
  }
}

export class NetworkError extends AppError {
  readonly kind = "network";

  constructor(
    readonly url: string,
    cause: unknown,
  ) {
    super(`Network failure requesting ${url}`, { cause });
  }
}

export class HttpError extends AppError {
  readonly kind = "http";

  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`Request to ${url} failed with HTTP ${String(status)}`);
  }
}

export class InvalidResponseError extends AppError {
  readonly kind = "invalid-response";

  constructor(
    readonly url: string,
    readonly issues: string,
    cause?: unknown,
  ) {
    super(`Unexpected response from ${url}:\n${issues}`, { cause });
  }
}

export type FetchError =
  TimeoutError | AbortedError | NetworkError | HttpError | InvalidResponseError;
