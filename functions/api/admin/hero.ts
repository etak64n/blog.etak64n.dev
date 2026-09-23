/**
 * POST /api/admin/hero — generate a hero image for an article with Workers AI.
 *
 * Request (JSON): { title, tags, body, hint?, prompt? }
 *   - Without `prompt`, a text model turns the article into an English image prompt in the
 *     blog's visual style. With `prompt`, that step is skipped.
 * Response: the raw image (JPEG/PNG/WebP), plus headers
 *   - X-Hero-Prompt: the prompt used, URL-encoded (headers are ASCII only)
 *   - X-Hero-Model:  the image model used
 * The admin UI fits the image into 1200x630 and converts it to WebP before uploading.
 *
 * Environment:
 *   AI              Workers AI binding (wrangler.toml)
 *   AI_TEXT_MODEL   optional override, default @cf/meta/llama-3.3-70b-instruct-fp8-fast
 *   AI_IMAGE_MODEL  optional override, default @cf/black-forest-labs/flux-1-schnell
 *   DEV_FAKE_AI     "true" returns a placeholder SVG instead of calling Workers AI (local dev)
 */
interface Env {
  AI?: Ai;
  AI_TEXT_MODEL?: string;
  AI_IMAGE_MODEL?: string;
  DEV_FAKE_AI?: string;
}

interface HeroRequest {
  title?: string;
  tags?: string[];
  body?: string;
  hint?: string;
  prompt?: string;
}

const DEFAULT_TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DEFAULT_IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell';

/** Visual style shared by every hero image, matching the site's light blue design. */
const STYLE =
  'flat vector illustration, clean minimal composition, soft light background, ' +
  'blue accent palette (navy, royal blue, pale blue), a few simple geometric objects that ' +
  'represent the topic, generous margins, wide landscape composition, no text, no letters, ' +
  'no logos, no watermark';
const NEGATIVE =
  'text, letters, words, typography, watermark, logo, signature, photo, photorealistic, ' +
  'blurry, low quality, deformed, cluttered';

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const clip = (text: string, max: number): string => (text.length > max ? text.slice(0, max) : text);

const escapeXml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Ask the text model for an image prompt; fall back to a template if anything goes wrong. */
async function writePrompt(env: Env, req: HeroRequest): Promise<string> {
  const tags = (req.tags ?? []).filter((tag) => typeof tag === 'string');
  const fallback =
    `${STYLE}. Topic: ${req.title || 'technology blog article'}` +
    (tags.length ? ` (${tags.join(', ')})` : '') +
    (req.hint ? `. ${req.hint}` : '');

  if (!env.AI) return fallback;

  const model = env.AI_TEXT_MODEL || DEFAULT_TEXT_MODEL;
  const messages = [
    {
      role: 'system',
      content:
        'You write prompts for a text-to-image model. Reply with JSON only: {"prompt": "..."}. ' +
        'The prompt must be in English, one paragraph under 80 words, describing a concrete scene of ' +
        'objects that symbolises the article topic. Never include people, faces, brand logos, text or ' +
        `letters. End the prompt with this exact style suffix: ${STYLE}`,
    },
    {
      role: 'user',
      content:
        `Article title: ${req.title ?? ''}\n` +
        `Tags: ${tags.join(', ')}\n` +
        `Author hint: ${req.hint || '(none)'}\n` +
        `Article excerpt:\n${clip(req.body ?? '', 1500)}`,
    },
  ];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await env.AI.run(model as any, {
      messages,
      max_tokens: 300,
      response_format: {
        type: 'json_schema',
        json_schema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as { response?: unknown };
    const raw = result?.response;
    const parsed = typeof raw === 'string' ? JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) : raw;
    const prompt = typeof (parsed as { prompt?: unknown })?.prompt === 'string' ? (parsed as { prompt: string }).prompt.trim() : '';

    if (prompt) return prompt.includes('no text') ? prompt : `${prompt}, ${STYLE}`;
  } catch (error) {
    console.warn('prompt generation failed, using the fallback prompt', error);
  }

  return fallback;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

function sniffImageType(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57) return 'image/webp';

  return 'application/octet-stream';
}

/** Run the image model. Handles both base64 JSON outputs (FLUX) and binary streams (SDXL etc.). */
async function generateImage(env: Env, model: string, prompt: string): Promise<{ bytes: Uint8Array; type: string }> {
  const input: Record<string, unknown> = { prompt };

  if (model.includes('flux-1-schnell')) {
    input.steps = 6; // max 8; the output is square, and the admin UI fits it into 1200x630
  } else {
    input.width = 1216;
    input.height = 640;
    input.negative_prompt = NEGATIVE;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await env.AI!.run(model as any, input as any);
  let bytes: Uint8Array;

  if (result instanceof ReadableStream) bytes = new Uint8Array(await new Response(result).arrayBuffer());
  else if (result instanceof ArrayBuffer) bytes = new Uint8Array(result);
  else if (result instanceof Uint8Array) bytes = result;
  else if (typeof result?.image === 'string') bytes = base64ToBytes(result.image);
  else throw new Error(`unexpected output from ${model}`);

  return { bytes, type: sniffImageType(bytes) };
}

/**
 * Local development stand-in: an SVG that shows what would have been sent to the model. It is
 * square like the output of the default model, so the admin UI's fitting is exercised locally.
 */
function fakeImage(prompt: string, title: string): Response {
  const lines = prompt.match(/.{1,60}(\s|$)/g) ?? [prompt];
  const text = lines
    .slice(0, 8)
    .map((line, i) => `<text x="60" y="${330 + i * 34}" font-size="22" fill="#334155">${escapeXml(line.trim())}</text>`)
    .join('');
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">' +
    '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#f8fafc"/></linearGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/><circle cx="830" cy="190" r="110" fill="#bfdbfe"/><rect x="700" y="800" width="260" height="120" rx="16" fill="#93c5fd"/>' +
    `<text x="60" y="120" font-size="44" font-weight="700" fill="#1e3a8a" font-family="sans-serif">${escapeXml(clip(title || 'DEV_FAKE_AI', 40))}</text>` +
    '<text x="60" y="170" font-size="20" fill="#64748b" font-family="sans-serif">DEV_FAKE_AI placeholder (Workers AI not called)</text>' +
    `<g font-family="sans-serif">${text}</g></svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
      'X-Hero-Prompt': encodeURIComponent(prompt),
      'X-Hero-Model': 'fake',
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let req: HeroRequest;

  try {
    req = (await request.json()) as HeroRequest;
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }

  // Local development: never touch Workers AI (it needs a Cloudflare login and is billed).
  const useFake = env.DEV_FAKE_AI === 'true' || !env.AI;
  const promptEnv = useFake ? { ...env, AI: undefined } : env;
  const prompt = clip((req.prompt ?? '').trim(), 1000) || (await writePrompt(promptEnv, req));

  if (useFake) {
    return fakeImage(prompt, req.title ?? '');
  }

  const model = env.AI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  try {
    const { bytes, type } = await generateImage(env, model, prompt);

    return new Response(bytes, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Hero-Prompt': encodeURIComponent(prompt),
        'X-Hero-Model': model,
      },
    });
  } catch (error) {
    console.error('image generation failed', error);

    return json({ error: `image generation failed: ${(error as Error).message}` }, 502);
  }
};
