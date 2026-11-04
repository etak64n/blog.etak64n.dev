/**
 * Calls to GitHub's REST and GraphQL APIs with the editor's token. Paths of REST calls are relative
 * to the repository, `/repos/<owner>/<name>`.
 */
import type { Config } from './config.ts';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function headers(config: Config, accept = 'application/vnd.github+json'): Record<string, string> {
  return {
    Accept: accept,
    Authorization: `Bearer ${config.githubToken}`,
    'User-Agent': 'blog.etak64n.dev-editor',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function failure(response: Response, what: string): Promise<GitHubError> {
  const detail = (await response.text().catch(() => '')).slice(0, 300);
  return new GitHubError(`GitHub ${what}: HTTP ${response.status} ${detail}`, response.status);
}

/** A REST call; `body` is sent as JSON, or as it is when it is already a JSON string. */
export async function rest<T>(config: Config, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}/repos/${config.owner}/${config.repo}${path}`, {
    method,
    headers: { ...headers(config), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response, `${method} ${path}`);
  return (await response.json()) as T;
}

export async function graphql<T>(config: Config, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { ...headers(config), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { owner: config.owner, repo: config.repo, ...variables } }),
  });
  if (!response.ok) throw await failure(response, 'GraphQL');
  const result = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (result.errors?.length || !result.data) {
    const messages = result.errors?.map((error) => error.message).join('; ') ?? 'no data';
    throw new GitHubError(`GitHub GraphQL: ${messages}`, 502);
  }
  return result.data;
}

/** A file of the branch as it is stored (its bytes), or the error response from GitHub. */
export function rawFile(config: Config, path: string): Promise<Response> {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return fetch(`${API}/repos/${config.owner}/${config.repo}/contents/${encoded}?ref=${encodeURIComponent(config.branch)}`, {
    headers: headers(config, 'application/vnd.github.raw+json'),
  });
}

export const commitUrl = (config: Config, sha: string) =>
  `https://github.com/${config.owner}/${config.repo}/commit/${sha}`;
