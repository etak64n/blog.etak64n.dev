/**
 * Turns a generated image into the blog's 1200x630 hero, as a WebP Blob.
 *
 * An image with (almost) the hero's aspect ratio is cropped to fill the frame. Anything else,
 * such as the square output of FLUX.1 [schnell], is shown whole in the middle of the frame, on
 * the image's own background colour, with its edges faded into it, so that the subject is never
 * cut off. The prompts ask for a plain light background, which makes the extension seamless.
 */

export const WIDTH = 1200;
export const HEIGHT = 630;

/** Aspect ratios this close to the hero's are cropped to fill the frame; others are fitted. */
const COVER_TOLERANCE = 0.08;

/** Width of the soft edge between a fitted image and the background around it. */
const FEATHER = 48;

/** Decode any image the browser can display (PNG, JPEG, WebP, SVG with a size). */
const loadImage = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('生成された画像を読み込めませんでした'));
    };
    image.src = url;
  });

/** Draw `image` centered on `ctx` at `scale` and return the rectangle it occupies. */
const drawCentered = (ctx, image, scale, width, height) => {
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  ctx.drawImage(image, x, y, w, h);

  return { x, y, w, h };
};

/**
 * The most common colour along the image's border, i.e. its background in a flat illustration.
 * Colours are grouped in 16 steps per channel and the group's average is returned.
 */
function backgroundColor(image) {
  const size = 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = size;
  canvas.height = size;
  ctx.drawImage(image, 0, 0, size, size);

  let data;

  try {
    ({ data } = ctx.getImageData(0, 0, size, size));
  } catch {
    return '#ffffff';
  }

  const groups = new Map();
  const add = (x, y) => {
    const i = (y * size + x) * 4;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const group = groups.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };

    group.n += 1;
    group.r += data[i];
    group.g += data[i + 1];
    group.b += data[i + 2];
    groups.set(key, group);
  };

  for (let i = 0; i < size; i += 1) {
    add(i, 0);
    add(i, size - 1);
    add(0, i);
    add(size - 1, i);
  }

  const best = [...groups.values()].sort((a, b) => b.n - a.n)[0];

  return `rgb(${Math.round(best.r / best.n)}, ${Math.round(best.g / best.n)}, ${Math.round(best.b / best.n)})`;
}

/** Fade the edges of `rect` that do not touch the canvas border, keeping the inside opaque. */
function featherEdges(ctx, { x, y, w, h }, width, height) {
  const fade = (x0, y0, x1, y1, length) => {
    const edge = Math.min(FEATHER, length / 8) / length;
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(edge, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1 - edge, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

  ctx.globalCompositeOperation = 'destination-in';

  if (w < width - 1) fade(x, 0, x + w, 0, w);
  if (h < height - 1) fade(0, y, 0, y + h, h);

  ctx.globalCompositeOperation = 'source-over';
}

/** Fit an image Blob into the hero frame and encode it as WebP. */
export async function toHeroWebp(blob) {
  const image = await loadImage(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ratio = image.naturalWidth / image.naturalHeight;

  if (Math.abs(ratio - WIDTH / HEIGHT) / (WIDTH / HEIGHT) <= COVER_TOLERANCE) {
    drawCentered(ctx, image, Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight), WIDTH, HEIGHT);
  } else {
    const fitted = document.createElement('canvas');
    const fittedCtx = fitted.getContext('2d');

    fitted.width = WIDTH;
    fitted.height = HEIGHT;

    const rect = drawCentered(fittedCtx, image, Math.min(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight), WIDTH, HEIGHT);

    featherEdges(fittedCtx, rect, WIDTH, HEIGHT);
    ctx.fillStyle = backgroundColor(image);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(fitted, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('WebP への変換に失敗しました'))), 'image/webp', 0.86);
  });
}
