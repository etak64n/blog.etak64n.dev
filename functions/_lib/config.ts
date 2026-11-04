/**
 * Settings of the editor's API, read from the environment of the Pages deployment: the variables in
 * wrangler.toml (`[env.production.vars]`) and the secrets set on the Pages project.
 */

export interface Env {
  /** Team domain of Cloudflare Access, `https://<team>.cloudflareaccess.com`: the tokens' issuer. */
  ACCESS_TEAM_DOMAIN?: string;
  /** Application audience (AUD) tag of the editor's Access application. */
  ACCESS_AUD?: string;
  /** The one email address allowed to edit (secret). */
  EDITOR_EMAIL?: string;
  /** `<owner>/<name>` of the repository holding the posts. */
  GITHUB_REPOSITORY?: string;
  /** Branch that the posts are read from and saved to. */
  GITHUB_BRANCH?: string;
  /** GitHub token that can read and write the repository's contents (secret). */
  GITHUB_TOKEN?: string;
}

export interface Config {
  accessTeamDomain: string;
  accessAud: string;
  editorEmail: string;
  owner: string;
  repo: string;
  branch: string;
  githubToken: string;
}

const NAMES = [
  'ACCESS_TEAM_DOMAIN',
  'ACCESS_AUD',
  'EDITOR_EMAIL',
  'GITHUB_REPOSITORY',
  'GITHUB_BRANCH',
  'GITHUB_TOKEN',
] as const satisfies readonly (keyof Env)[];

const TEAM_DOMAIN = /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/;
const REPOSITORY = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/;

/**
 * The settings, or `undefined` when the editor is off for this deployment. It is off when none of
 * the settings are set (previews), and when any is missing or malformed, which is also logged.
 */
export function readConfig(env: Env): Config | undefined {
  const missing = NAMES.filter((name) => !env[name]);
  if (missing.length === NAMES.length) return undefined;
  if (missing.length > 0) {
    console.error(`editor: the API is off because these settings are missing: ${missing.join(', ')}`);
    return undefined;
  }
  const teamDomain = env.ACCESS_TEAM_DOMAIN ?? '';
  const repository = REPOSITORY.exec(env.GITHUB_REPOSITORY ?? '');
  if (!TEAM_DOMAIN.test(teamDomain)) {
    console.error('editor: ACCESS_TEAM_DOMAIN must be https://<team>.cloudflareaccess.com');
    return undefined;
  }
  if (!repository) {
    console.error('editor: GITHUB_REPOSITORY must be <owner>/<name>');
    return undefined;
  }
  return {
    accessTeamDomain: teamDomain,
    accessAud: env.ACCESS_AUD ?? '',
    editorEmail: env.EDITOR_EMAIL ?? '',
    owner: repository[1],
    repo: repository[2],
    branch: env.GITHUB_BRANCH ?? '',
    githubToken: env.GITHUB_TOKEN ?? '',
  };
}
