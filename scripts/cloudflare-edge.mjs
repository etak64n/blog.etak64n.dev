#!/usr/bin/env node
/**
 * Cloudflare settings of blog.etak64n.dev that live outside this repository's deploys: the
 * response headers set by Transform Rules of the zone etak64n.dev (for the public pages and for the
 * editor at /admin/), and the redirect of the project's pages.dev hostname to the custom domain.
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
  // Inline scripts of the pages and the Web Analytics beacon that Cloudflare inserts into them (it
  // reports to /cdn-cgi/rum on this origin). The site loads nothing from jsDelivr; it can be dropped
  // from these directives the next time the rules are applied.
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

/** Rule for the public pages. It sits before the editor's rule, which then replaces its CSP on /admin. */
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

/**
 * Content-Security-Policy of the editor at /admin/ (src/admin/): the public pages' policy without
 * jsDelivr, plus `blob:` images (images added in the editor, shown before they are saved) and
 * WebAssembly (`'wasm-unsafe-eval'`, the WebP encoder).
 */
const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Rule for the editor. It sits after the public pages' rule, whose CSP it replaces on /admin. */
const ADMIN_RULE = {
  description: '3) blog 管理画面(/admin): 編集画面の CSP（追加した画像の blob: と、WebP の変換の WebAssembly を許可）',
  expression: `(http.host eq "${HOST}" and starts_with(http.request.uri.path, "/admin"))`,
  action: 'rewrite',
  action_parameters: {
    headers: {
      'Content-Security-Policy': { operation: 'set', value: ADMIN_CSP },
      'Permissions-Policy': { operation: 'set', value: 'camera=(), microphone=(), geolocation=()' },
    },
  },
  enabled: true,
};
const ADMIN_RULE_PREFIX = '3) blog 管理画面';

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
  const base = `/zones/${zone.id}/rulesets/${headers.id}/rules`;
  const blogIndex = rules.findIndex((r) => (r.description ?? '').startsWith(BLOG_RULE_PREFIX));
  const adminIndex = rules.findIndex((r) => (r.description ?? '').startsWith(ADMIN_RULE_PREFIX));
  const admin = rules[adminIndex];

  // The public pages' rule comes before the editor's rule.
  if (blogIndex < 0) {
    steps.push({
      what: `add rule "${BLOG_RULE_PREFIX}"${admin ? ` before "${ADMIN_RULE_PREFIX}"` : ''}`,
      run: () => api('POST', base, { ...ruleBody(BLOG_RULE), ...(admin ? { position: { before: admin.id } } : {}) }),
    });
  } else {
    const blog = rules[blogIndex];
    const misplaced = admin !== undefined && blogIndex > adminIndex;

    if (misplaced || !same(ruleBody(blog), ruleBody({ ...BLOG_RULE, ref: blog.ref }))) {
      steps.push({
        what: `update rule "${BLOG_RULE_PREFIX}"${misplaced ? ` and move it before "${ADMIN_RULE_PREFIX}"` : ''}`,
        run: () =>
          api('PATCH', `${base}/${blog.id}`, { ...ruleBody(BLOG_RULE), ...(misplaced ? { position: { before: admin.id } } : {}) }),
      });
    }
  }

  // A new editor's rule is added after every rule, and so after the public pages' rule.
  if (!admin) {
    steps.push({ what: `add rule "${ADMIN_RULE_PREFIX}"`, run: () => api('POST', base, ruleBody(ADMIN_RULE)) });
  } else if (!same(ruleBody(admin), ruleBody({ ...ADMIN_RULE, ref: admin.ref }))) {
    steps.push({
      what: `update rule "${ADMIN_RULE_PREFIX}"`,
      run: () => api('PATCH', `${base}/${admin.id}`, ruleBody(ADMIN_RULE)),
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
