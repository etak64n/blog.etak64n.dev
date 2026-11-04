/**
 * Request handling shared by the routes of the editor's API (functions/admin/api/). Pages Functions
 * call a route's `onRequest*` export with the context below (the part of Cloudflare's EventContext
 * that the API uses).
 */
import type { Config, Env } from './config.ts';
import { GitHubError } from './github.ts';

export interface Context {
  request: Request;
  env: Env;
  /** Shared by the middleware and the route; the middleware puts the settings in `config`. */
  data: Record<string, unknown>;
  next(): Promise<Response>;
}

export type Handler = (context: Context) => Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** The answer when the API is off or the request did not come through Cloudflare Access. */
export function notFound(): Response {
  return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

/** An error answered to the editor as `{ error }` with the status `status`. */
export class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * A route that runs with the settings checked by the middleware. Errors are answered as
 * `{ error: message }`: RequestError with its status, GitHub's errors with 502, others with 500.
 */
export function route(handler: (request: Request, config: Config) => Promise<Response>): Handler {
  return async ({ request, data }) => {
    const config = data.config as Config | undefined;
    if (!config) return notFound();
    try {
      return await handler(request, config);
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: message }, error instanceof GitHubError ? 502 : 500);
    }
  };
}
