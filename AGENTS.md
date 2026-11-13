This is an EmDash site -- a CMS built on Astro with a full admin UI at `/_emdash/admin`. It runs on Cloudflare Workers (D1, R2, KV) and is deployed with the Cloudflare CLI (`cf`), not wrangler.

## Key files

| File | Purpose |
| --- | --- |
| `cloudflare.config.ts` | The Worker, its domain and bindings, read by `cf` and `@astrojs/cloudflare` |
| `astro.config.mjs` | Astro config with the `emdash()` integration |
| `seed/seed.json` | The schema (the `posts`, `magazines` and `pages` collections, the `magazines_posts` relation and the `tag` taxonomy) and the posts moved over from the previous blog. It is applied once, when setup runs on an empty database; the live site's schema is changed through the admin or its API |
| `src/styles/global.css` | All the styles. The look is that of the previous blog (Zola, then Astro); keep it |
| `src/layouts/Base.astro` | The page frame: head, header, footer |
| `src/components/content/` | How the post text (Portable Text) is drawn: headings with anchors, quotes with their source, note boxes, code boxes, tables |
| `src/lib/` | Post and magazine queries, pagination, related and adjacent posts, dates (YYYY/MM/DD in Japan time), the table of contents |
| `src/plugins/ai-image/` | A native EmDash plugin: the editor of image fields with `widget: "ai-image:image"` (`admin.tsx`) and the routes that draw images with Workers AI (`plugin.ts`), registered by `descriptor.mjs` in `astro.config.mjs` |

## Rules

- All pages are server-rendered. No `getStaticPaths()` for CMS content.
- `entry.id` is the slug (for URLs); `entry.data.id` is the database ULID (for `getTermsForEntries` and the like).
- Posts are at `/articles/<slug>/` and tags at `/tags/<slug>/`; pages end in a slash (`src/middleware.ts`).
- Public pages are cached for `PAGE_CACHE_SECONDS` per Cloudflare data center by `src/middleware.ts` (Cache API), and resized images (`/_image`) for `IMAGE_CACHE_SECONDS` there and in the browser; requests with the `astro-session` cookie or `_preview` bypass it. Never let a response that varies by visitor through that cache.
- Images go through EmDash's `Image` component, which resizes them with the Images binding (`IMAGES`). It does so only for media of the site set as `siteUrl` in `astro.config.mjs`; without it, pages show the uploaded originals.
- Pages read only the entries they show (a page of posts, the related posts through tags): D1's read allowance is shared by every database on the account. Never read every post on a page view.
- Nothing is installed or run on the local machine. The lockfile comes from the Lockfile workflow, and builds run in the Deploy workflow.

## Skills and docs

Agent skills are in `.agents/skills/` (building-emdash-site, creating-plugins, emdash-cli). The EmDash docs are an MCP server at `https://docs.emdashcms.com/mcp`.
