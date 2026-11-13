# blog.etak64n.dev

The source of [blog.etak64n.dev](https://blog.etak64n.dev/), a blog on [EmDash](https://github.com/emdash-cms/emdash) that runs on Cloudflare Workers.

## Writing

Posts are written, previewed and published in the admin at [blog.etak64n.dev/_emdash/admin](https://blog.etak64n.dev/_emdash/admin), signed in with a passkey. Posts, tags and images are kept by EmDash (D1 and R2), not in this repository.

Two lines in a quote are set in their own way:

- A last line starting with `出典:` names the source of the quotation and appears under it.
- A first line `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` turns the quote into a note box.

A paragraph starting with `出典:` right under an image appears as its caption.

## Pages

| Page | Path |
| --- | --- |
| Latest posts | `/` |
| All posts | `/articles/` |
| A post | `/articles/<slug>/` |
| Tags | `/tags/`, `/tags/<slug>/` |
| Search | `/search/?q=<words>` |

## Deploying

A push to `main` deploys the site with the Cloudflare CLI (`pnpm exec cf deploy`), as `.github/workflows/deploy.yml` does. The Worker, its domain and its D1, R2 and KV bindings are in `cloudflare.config.ts`.

After changing `package.json`, run the **Lockfile** workflow and commit the `pnpm-lock.yaml` it produces.
