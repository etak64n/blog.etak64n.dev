// Runs a request again after a short wait while it fails in a way that may pass: a lost
// connection, or an answer of 429 or 5xx. Only requests that may run twice without harm run
// again (reads, and the blobs and trees of Git, which the same content always makes the same).

export interface RetryOptions {
  /** How many times to try in all, the first time included. */
  attempts: number;
  /** The wait before the second attempt, which doubles before each later one. */
  firstDelayMs: number;
  retryable: (error: unknown) => boolean;
}

export async function retry<T>(action: () => Promise<T>, options: RetryOptions): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= options.attempts || !options.retryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, options.firstDelayMs * 2 ** (attempt - 1)));
    }
  }
}

/** Too many requests, or a failure of the server or of a service behind it. */
export function isPassingStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
