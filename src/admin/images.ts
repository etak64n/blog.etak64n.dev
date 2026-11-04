/**
 * Images added to a post in the editor: chosen, pasted or dropped files become files of the post's
 * folder. Photos and screenshots are converted to WebP in the browser, at most twice the article
 * width (the largest size the site shows, src/site.ts); SVG and GIF files are kept as they are.
 * Safari's canvas cannot write WebP, so the encoder is libwebp built for WebAssembly (jSquash),
 * loaded when the first image is added.
 */
import { CONTENT_WIDTH } from '../site.ts';

const MAX_WIDTH = CONTENT_WIDTH * 2;
const WEBP_QUALITY = 90;

export interface AddedImage {
  /** File name in the post's folder. */
  name: string;
  blob: Blob;
}

/** `name` without its extension, as lowercase letters, digits and hyphens (`image` if nothing is left). */
function baseName(name: string): string {
  const stem = name.replace(/\.[^.]*$/, '');
  const base = stem
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'image';
}

/** `<base>.<extension>`, or `<base>-2.<extension>` and so on when the name is taken. */
function freeName(base: string, extension: string, taken: (name: string) => boolean): string {
  for (let n = 1; ; n += 1) {
    const name = n === 1 ? `${base}.${extension}` : `${base}-${n}.${extension}`;
    if (!taken(name)) return name;
  }
}

/** Converts `file` into the image to store next to the post. */
export async function prepareImage(file: File, taken: (name: string) => boolean): Promise<AddedImage> {
  const base = baseName(file.name);
  if (file.type === 'image/svg+xml') return { name: freeName(base, 'svg', taken), blob: file };
  if (file.type === 'image/gif') return { name: freeName(base, 'gif', taken), blob: file };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} はこのブラウザで画像として読み込めません`);
  }
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を変換できません（canvas が使えません）');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { default: encode } = await import('@jsquash/webp/encode');
  const webp = await encode(context.getImageData(0, 0, width, height), { quality: WEBP_QUALITY });
  return { name: freeName(base, 'webp', taken), blob: new Blob([webp], { type: 'image/webp' }) };
}

/** The image files among dropped or pasted data. */
export function imageFiles(data: DataTransfer | null): File[] {
  return [...(data?.files ?? [])].filter((file) => file.type.startsWith('image/'));
}

/** The contents of `blob` as base64, for uploading. */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('画像を読み込めません'));
    reader.readAsDataURL(blob);
  });
}
