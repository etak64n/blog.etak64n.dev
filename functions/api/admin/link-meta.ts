/**
 * GET /api/admin/link-meta?url=<page URL> — the title and description of a page, which the body
 * editor puts into link cards and references (functions/lib/link-meta.ts). The admin middleware
 * requires a same-origin request with the ADMIN_KEY.
 *
 * Response (JSON): { url, title, description, siteName }, with empty strings for what the page
 * does not declare; 400 for an unusable URL, 502 when the page cannot be read.
 */
import { fetchLinkMeta, fetchableUrl } from '../../lib/link-meta';

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export const onRequestGet: PagesFunction = async ({ request }) => {
  const target = fetchableUrl(new URL(request.url).searchParams.get('url') ?? '');

  if (!target) return json({ error: 'url must be an http(s) address on a public host' }, 400);

  const meta = await fetchLinkMeta(target.href);

  return meta ? json(meta) : json({ error: 'the page could not be read' }, 502);
};
