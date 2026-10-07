/**
 * Generates the hero image of a post with Workers AI and saves it next to the post.
 *
 *   npm run hero -- <slug> [--subject "<scene, in English>"] [--open]
 *
 * 1. A text model reads the post's title, description and opening, and describes in one sentence a
 *    scene that represents the topic. `--subject` gives the scene instead.
 * 2. FLUX.2 [klein] draws the scene in the look of HERO_STYLE, in the 1.9:1 shape of hero images.
 * 3. The image is cropped to 1200×630 and saved as <slug>/hero.webp, and `hero: ./hero.webp` is set
 *    in the post's front matter. Running the command again replaces the image.
 *
 * `--open` opens the image in VS Code with the `code` command.
 *
 * Credentials come from environment variables: CLOUDFLARE_ACCOUNT_ID, and either CLOUDFLARE_API_TOKEN
 * (an API token with the Workers AI permission) or CLOUDFLARE_EMAIL with CLOUDFLARE_API_KEY (the Global
 * API Key). `npm run hero` reads them from ~/.config/blog-etak64n/cloudflare.env when that file exists.
 *
 * HERO_FAKE=1 draws a plain image instead of calling Workers AI; CI uses it to check the rest.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { slugProblem } from '../src/lib/post-path.ts';

/** The look shared by every hero image; the scene of each post follows it in the prompt. */
const HERO_STYLE =
  'Flat vector illustration for a tech blog header, clean geometric shapes, soft muted blue and teal palette with warm accents, subtle gradients, generous empty space, centered composition, no text, no letters, no logos.';

const TEXT_MODEL = '@cf/openai/gpt-oss-120b';
const IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

/** Drawn at the model's size closest to 1200×630 (both sides multiples of 16), then cropped. */
const DRAW = { width: 1216, height: 640 };
const HERO = { width: 1200, height: 630, file: 'hero.webp' };

const SUBJECT_INSTRUCTIONS =
  'You write prompts for an image generation model. Reply with one English sentence of at most 50 words describing a simple visual scene that represents the topic of the given Japanese tech blog post. Use concrete objects. No people, text, letters, numbers, logos or user interfaces in the scene.';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// ------------------------------------------------------------------ arguments

const args = process.argv.slice(2);
const subjectIndex = args.indexOf('--subject');
const givenSubject = subjectIndex >= 0 ? args[subjectIndex + 1] : undefined;
const open = args.includes('--open');
const slug = args.find((arg, index) => !arg.startsWith('--') && (subjectIndex < 0 || index !== subjectIndex + 1));

if (!slug) fail('使い方: npm run hero -- <slug> [--subject "<英語で場面の説明>"] [--open]');
if (subjectIndex >= 0 && !givenSubject) fail('--subject の後に、場面の説明を英語で書いてください');
const problem = slugProblem(slug);
if (problem) fail(problem);

const dir = `src/content/blog/${slug}`;
const postFile = [`${dir}/${slug}.md`, `${dir}/${slug}.mdx`].find((file) => existsSync(file));
if (!postFile) fail(`記事が見つかりません: ${dir}/${slug}.md`);

// ------------------------------------------------------------------ the post

const source = readFileSync(postFile, 'utf8');
const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
if (!frontMatter) fail(`フロントマターが見つかりません: ${postFile}`);

/** A plain `key: value` of the front matter, without quotes. */
function field(name: string): string {
  const line = new RegExp(`^${name}:[ \\t]*(.*)$`, 'm').exec(frontMatter![1]);
  return (line?.[1] ?? '').trim().replace(/^(["'])(.*)\1$/, '$2');
}

const title = field('title');
const description = field('description');
const opening = source
  .slice(frontMatter[0].length)
  .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\S\n]*$/gm, '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .slice(0, 1500)
  .trim();

// ------------------------------------------------------------------ Workers AI

const fake = process.env.HERO_FAKE === '1';
const env = process.env;

function authHeaders(): Record<string, string> {
  if (env.CLOUDFLARE_API_TOKEN) return { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };
  if (env.CLOUDFLARE_EMAIL && env.CLOUDFLARE_API_KEY) {
    return { 'X-Auth-Email': env.CLOUDFLARE_EMAIL, 'X-Auth-Key': env.CLOUDFLARE_API_KEY };
  }
  fail(
    'Cloudflare の認証情報がありません。CLOUDFLARE_ACCOUNT_ID と、CLOUDFLARE_API_TOKEN（または CLOUDFLARE_EMAIL と CLOUDFLARE_API_KEY）を ~/.config/blog-etak64n/cloudflare.env に書いてください',
  );
}

async function workersAi(path: string, body: RequestInit['body'], headers: Record<string, string> = {}): Promise<unknown> {
  if (!env.CLOUDFLARE_ACCOUNT_ID) fail('CLOUDFLARE_ACCOUNT_ID がありません（~/.config/blog-etak64n/cloudflare.env）');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), ...headers },
    body,
    signal: AbortSignal.timeout(180_000),
  });
  const json: unknown = await response.json().catch(() => undefined);
  if (!response.ok) fail(`Workers AI がエラーを返しました（HTTP ${response.status}）: ${JSON.stringify(json)}`);
  return json;
}

/** One sentence describing a scene for the post. */
async function writeSubject(): Promise<string> {
  const json = (await workersAi(
    'v1/chat/completions',
    JSON.stringify({
      model: TEXT_MODEL,
      max_tokens: 800,
      messages: [
        { role: 'system', content: SUBJECT_INSTRUCTIONS },
        { role: 'user', content: `タイトル: ${title}\n概要: ${description}\n\n本文の冒頭:\n${opening}` },
      ],
    }),
    { 'Content-Type': 'application/json' },
  )) as { choices?: { message?: { content?: string } }[] };
  const subject = json.choices?.[0]?.message?.content?.trim();
  if (!subject) fail(`場面の説明を作れませんでした: ${JSON.stringify(json)}`);
  return subject;
}

/** The drawn image, as returned by the model (JPEG). */
async function draw(prompt: string): Promise<Buffer> {
  const form = new FormData();
  form.append('prompt', prompt);
  form.append('width', String(DRAW.width));
  form.append('height', String(DRAW.height));
  const json = (await workersAi(`run/${IMAGE_MODEL}`, form)) as { result?: { image?: string } };
  const image = json.result?.image;
  if (!image) fail(`画像を作れませんでした: ${JSON.stringify(json).slice(0, 500)}`);
  return Buffer.from(image, 'base64');
}

// ------------------------------------------------------------------ main

const subject = fake ? 'a plain test image' : (givenSubject ?? (await writeSubject()));
console.log(`場面: ${subject}`);

const drawn = fake
  ? await sharp({ create: { width: DRAW.width, height: DRAW.height, channels: 3, background: '#88c0d0' } })
      .png()
      .toBuffer()
  : await draw(`${HERO_STYLE} ${subject}`);

const heroPath = `${dir}/${HERO.file}`;
await sharp(drawn).resize(HERO.width, HERO.height, { fit: 'cover' }).webp({ quality: 90 }).toFile(heroPath);

// Point the front matter at the new image: replace the `hero:` line, or add one at the end.
const heroLine = `hero: ./${HERO.file}`;
const previous = field('hero');
const updatedFrontMatter = /^hero:.*$/m.test(frontMatter[1])
  ? frontMatter[1].replace(/^hero:.*$/m, heroLine)
  : `${frontMatter[1]}\n${heroLine}`;
writeFileSync(postFile, source.replace(frontMatter[1], () => updatedFrontMatter));

console.log(`作成しました: ${heroPath}`);
if (previous && previous !== `./${HERO.file}`) {
  console.log(`フロントマターの hero を ${previous} から ./${HERO.file} に変えました（${previous} は残っています）`);
}

if (open) {
  const result = spawnSync('code', ['--reuse-window', heroPath], { stdio: 'inherit' });
  if (result.error) console.error('code コマンドが見つかりません。画像を直接開いてください。');
}
