This is an EmDash site -- a CMS built on Astro with a full admin UI at `/_emdash/admin`. It runs on Cloudflare Workers (D1, R2, KV) and is deployed with the Cloudflare CLI (`cf`), not wrangler.

## Key files

| File | Purpose |
| --- | --- |
| `cloudflare.config.ts` | The Worker, its domain and bindings, read by `cf` and `@astrojs/cloudflare` |
| `astro.config.mjs` | Astro config with the `emdash()` integration |
| `seed/seed.json` | The schema (the `posts` collection and the `tag` taxonomy) and the posts moved over from the previous blog. It is applied once, when setup runs on an empty database |
| `src/styles/global.css` | All the styles. The look is that of the previous blog (Zola, then Astro); keep it |
| `src/layouts/Base.astro` | The page frame: head, header, footer |
| `src/components/content/` | How the post text (Portable Text) is drawn: headings with anchors, quotes with their source, note boxes, code boxes, tables |
| `src/lib/` | Post queries, pagination, related posts, dates (YYYY/MM/DD in Japan time), the table of contents |

## Rules

- All pages are server-rendered. No `getStaticPaths()` for CMS content.
- `entry.id` is the slug (for URLs); `entry.data.id` is the database ULID (for `getTermsForEntries` and the like).
- Posts are at `/articles/<slug>/` and tags at `/tags/<slug>/`; pages end in a slash (`src/middleware.ts`).
- Nothing is installed or run on the local machine. The lockfile comes from the Lockfile workflow, and builds run in the Deploy workflow.

## Skills and docs

Agent skills are in `.agents/skills/` (building-emdash-site, creating-plugins, emdash-cli). The EmDash docs are an MCP server at `https://docs.emdashcms.com/mcp`.
