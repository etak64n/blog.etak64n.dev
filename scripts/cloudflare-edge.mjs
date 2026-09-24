#!/usr/bin/env node
/**
 * Cloudflare settings of blog.etak64n.dev that live outside this repository's deploys: the
 * response headers set by Transform Rules of the zone etak64n.dev, and the redirect of the
 * project's pages.dev hostname to the custom domain.
 *
 *   node --env-file=<file with the CLOUDFLARE_* variables> scripts/cloudflare-edge.mjs [--apply]
 *
 * Without --apply it only prints what differs from the settings below. With --apply it changes
 * those settings, then reads everything back and prints the remaining differences (none).
 *
 * Credentials, from the environment:
 * - CLOUDFLARE_API_TOKEN, or CLOUDFLARE_EMAIL with CLOUDFLARE_API_KEY (Global API Key)
 * - CLOUDFLARE_ACCOUNT_ID (optional: taken from the zone otherwise)
 * An API token needs Zone > Transform Rules > Edit, Account > Bulk URL Redirects > Edit and
 * Account > Account Filter Lists > Edit.
 *
 * Only the blog's own settings are touched. The zone's other rules, including the fallback rule
 * that sets headers for every other host of the zone, are shared with other apps and left as
 * they are.
 */

const ZONE = 'etak64n.dev';
const HOST = 'blog.etak64n.dev';

/** Content-Security-Policy of the public pages; checked against the site's pages and scripts. */
const BLOG_CSP = [
  "default-src 'self'",
  // Inline scripts of base.html, KaTeX from jsDelivr, and the Web Analytics beacon that
  // Cloudflare inserts into the pages (it reports to /cdn-cgi/rum on this origin).
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  // Articles may show images and media from any site.
  "img-src 'self' data: https:",
  "media-src 'self' https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Rule for the public pages. It sits before the admin rule, which then replaces its CSP on /admin. */
const BLOG_RULE = {
  description: '2b) blog 公開ページ: 専用CSP（KaTeX と Web Analytics、https の画像と動画を許可。/admin は 3) で上書き）',
  expression: `(http.host eq "${HOST}")`,
  action: 'rewrite',
  action_parameters: {
    headers: {
      'Content-Security-Policy': { operation: 'set', value: BLOG_CSP },
      'Permissions-Policy': { operation: 'set', value: 'camera=(), microphone=(), geolocation=()' },
    },
  },
  enabled: true,
};
const BLOG_RULE_PREFIX = '2b) blog 公開ページ';

/** Directives of the admin rule's CSP that must match, so that the CMS preview shows the same images. */
const ADMIN_RULE_PREFIX = '3) blog 管理画面';
const ADMIN_DIRECTIVES = {
  'img-src': "'self' data: blob: https:",
  'media-src': "'self' blob: https:",
};

/** Redirect of the production pages.dev hostname; preview deployments (subdomains) stay reachable. */
const LIST_NAME = 'blog_pages_dev';
const LIST_DESCRIPTION = 'etak64n-blog.pages.dev を blog.etak64n.dev へ転送';
const REDIRECT_ITEM = {
  source_url: 'etak64n-blog.pages.dev/',
  target_url: 'https://blog.etak64n.dev/',
  status_code: 301,
  preserve_query_string: true,
  subpath_matching: true,
  preserve_path_suffix: true,
  include_subdomains: false,
};
const REDIRECT_RULE = {
  ref: 'blog_pages_dev',
  description: 'blog: etak64n-blog.pages.dev を独自ドメインへ',
  expression: `http.request.full_uri in $${LIST_NAME}`,
  action: 'redirect',
  action_parameters: { from_list: { name: LIST_NAME, key: 'http.request.full_uri' } },
  enabled: true,
};

/* ---------------------------------------------------------------- API */

const apply = process.argv.includes('--apply');
const env = process.env;

function authHeaders() {
  if (env.CLOUDFLARE_API_TOKEN) return { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };
  if (env.CLOUDFLARE_EMAIL && env.CLOUDFLARE_API_KEY) {
    return { 'X-Auth-Email': env.CLOUDFLARE_EMAIL, 'X-Auth-Key': env.CLOUDFLARE_API_KEY };
  }
  throw new Error('set CLOUDFLARE_API_TOKEN, or CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY');
}

/** Call the Cloudflare API; `allow404` returns null instead of failing on 404. */
async function api(method, path, body, { allow404 = false } = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (allow404 && response.status === 404) return null;

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const errors = (json?.errors ?? []).map((e) => `${e.code} ${e.message}`).join('; ');

    throw new Error(`${method} ${path.replace(/[0-9a-f]{32}/g, '…')}: ${response.status} ${errors}`);
  }

  return json.result;
}

/* ---------------------------------------------------------------- helpers */

/** `a; b c; d` → [['a', ''], ['b', 'c'], ['d', '']], keeping the order. */
const parseCsp = (csp) =>
  csp
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\s+/);

      return [name.toLowerCase(), values.join(' ')];
    });

/** The CSP with the given directives set (replaced in place, or appended). */
function withDirectives(csp, directives) {
  const parts = parseCsp(csp);

  for (const [name, value] of Object.entries(directives)) {
    const found = parts.find(([n]) => n === name);

    if (found) found[1] = value;
    else parts.push([name, value]);
  }

  return parts.map(([name, value]) => (value ? `${name} ${value}` : name)).join('; ');
}

/** JSON with sorted keys, so that the order in which the API returns fields does not matter. */
const stable = (value) =>
  Array.isArray(value)
    ? `[${value.map(stable).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
      : JSON.stringify(value);

const same = (a, b) => stable(a) === stable(b);

const ruleBody = (rule) => ({
  description: rule.description,
  expression: rule.expression,
  action: rule.action,
  action_parameters: rule.action_parameters,
  enabled: rule.enabled,
  ...(rule.ref ? { ref: rule.ref } : {}),
});

async function waitForBulkOperation(accountId, operationId) {
  for (let i = 0; i < 30; i += 1) {
    const status = await api('GET', `/accounts/${accountId}/rules/lists/bulk_operations/${operationId}`);

    if (status.status === 'completed') return;
    if (status.status === 'failed') throw new Error(`list operation failed: ${status.error ?? ''}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('list operation did not complete in 30 s');
}

/* ---------------------------------------------------------------- plan */

/** Read the current settings and return the steps that bring them to the settings above. */
async function plan() {
  const [zone] = await api('GET', `/zones?name=${ZONE}`);

  if (!zone) throw new Error(`zone ${ZONE} not found`);

  const accountId = env.CLOUDFLARE_ACCOUNT_ID || zone.account.id;
  const steps = [];

  // Response header Transform Rules of the zone.
  const headers = await api('GET', `/zones/${zone.id}/rulesets/phases/http_response_headers_transform/entrypoint`);
  const rules = headers.rules ?? [];
  const adminIndex = rules.findIndex((r) => (r.description ?? '').startsWith(ADMIN_RULE_PREFIX));
  const blogIndex = rules.findIndex((r) => (r.description ?? '').startsWith(BLOG_RULE_PREFIX));

  if (adminIndex < 0) throw new Error(`rule "${ADMIN_RULE_PREFIX}" not found; nothing to place the blog rule before`);

  const admin = rules[adminIndex];
  const base = `/zones/${zone.id}/rulesets/${headers.id}/rules`;

  if (blogIndex < 0) {
    steps.push({
      what: `add rule "${BLOG_RULE_PREFIX}" before "${ADMIN_RULE_PREFIX}"`,
      run: () => api('POST', base, { ...ruleBody(BLOG_RULE), position: { before: admin.id } }),
    });
  } else {
    const blog = rules[blogIndex];
    const misplaced = blogIndex > adminIndex;

    if (misplaced || !same(ruleBody(blog), ruleBody({ ...BLOG_RULE, ref: blog.ref }))) {
      steps.push({
        what: `update rule "${BLOG_RULE_PREFIX}"${misplaced ? ' and move it before the admin rule' : ''}`,
        run: () =>
          api('PATCH', `${base}/${blog.id}`, { ...ruleBody(BLOG_RULE), ...(misplaced ? { position: { before: admin.id } } : {}) }),
      });
    }
  }

  const adminCsp = admin.action_parameters?.headers?.['Content-Security-Policy']?.value ?? '';
  const nextAdminCsp = withDirectives(adminCsp, ADMIN_DIRECTIVES);

  if (nextAdminCsp !== adminCsp) {
    const changed = Object.keys(ADMIN_DIRECTIVES).join(', ');
    const nextAdmin = structuredClone(admin);

    nextAdmin.action_parameters.headers['Content-Security-Policy'].value = nextAdminCsp;
    steps.push({
      what: `set ${changed} of rule "${ADMIN_RULE_PREFIX}"`,
      run: () => api('PATCH', `${base}/${admin.id}`, ruleBody(nextAdmin)),
    });
  }

  // Bulk redirect: list, its item, and the account's redirect rule.
  const lists = await api('GET', `/accounts/${accountId}/rules/lists`);
  const list = lists.find((l) => l.name === LIST_NAME);

  if (!list) {
    steps.push({
      what: `create redirect list "${LIST_NAME}" with ${REDIRECT_ITEM.source_url} → ${REDIRECT_ITEM.target_url}`,
      run: async () => {
        const created = await api('POST', `/accounts/${accountId}/rules/lists`, {
          name: LIST_NAME,
          description: LIST_DESCRIPTION,
          kind: 'redirect',
        });
        const { operation_id: op } = await api('POST', `/accounts/${accountId}/rules/lists/${created.id}/items`, [
          { redirect: REDIRECT_ITEM },
        ]);

        await waitForBulkOperation(accountId, op);
      },
    });
  } else {
    const items = await api('GET', `/accounts/${accountId}/rules/lists/${list.id}/items`);
    const current = items.map((i) => i.redirect).filter(Boolean);
    const wanted = (item) =>
      Object.entries(REDIRECT_ITEM).every(([key, value]) => item?.[key] === value);

    if (current.length !== 1 || !wanted(current[0])) {
      steps.push({
        what: `replace the items of list "${LIST_NAME}" with ${REDIRECT_ITEM.source_url} → ${REDIRECT_ITEM.target_url}`,
        run: async () => {
          const { operation_id: op } = await api('PUT', `/accounts/${accountId}/rules/lists/${list.id}/items`, [
            { redirect: REDIRECT_ITEM },
          ]);

          await waitForBulkOperation(accountId, op);
        },
      });
    }
  }

  const redirects = await api('GET', `/accounts/${accountId}/rulesets/phases/http_request_redirect/entrypoint`, undefined, {
    allow404: true,
  });

  if (!redirects) {
    steps.push({
      what: `create the account's bulk redirect rules with "${REDIRECT_RULE.description}"`,
      run: () =>
        api('POST', `/accounts/${accountId}/rulesets`, {
          name: 'default',
          kind: 'root',
          phase: 'http_request_redirect',
          rules: [REDIRECT_RULE],
        }),
    });
  } else {
    const rule = (redirects.rules ?? []).find((r) => r.expression === REDIRECT_RULE.expression || r.ref === REDIRECT_RULE.ref);
    const rulesPath = `/accounts/${accountId}/rulesets/${redirects.id}/rules`;

    if (!rule) {
      steps.push({ what: `add bulk redirect rule "${REDIRECT_RULE.description}"`, run: () => api('POST', rulesPath, REDIRECT_RULE) });
    } else if (!same(ruleBody({ ...rule, ref: REDIRECT_RULE.ref }), ruleBody(REDIRECT_RULE))) {
      steps.push({
        what: `update bulk redirect rule "${REDIRECT_RULE.description}"`,
        run: () => api('PATCH', `${rulesPath}/${rule.id}`, REDIRECT_RULE),
      });
    }
  }

  return steps;
}

/* ---------------------------------------------------------------- main */

const steps = await plan();

if (!steps.length) {
  console.log('Cloudflare settings of the blog are up to date.');
} else {
  console.log(`${apply ? 'Applying' : 'Would apply'} ${steps.length} change(s):`);
  steps.forEach((step) => console.log(`- ${step.what}`));
}

if (apply && steps.length) {
  for (const step of steps) {
    await step.run();
    console.log(`done: ${step.what}`);
  }

  const remaining = await plan();

  console.log(remaining.length ? `still different: ${remaining.map((s) => s.what).join('; ')}` : 'verified: settings match.');
  process.exitCode = remaining.length ? 1 : 0;
}
