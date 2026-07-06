// Site-wide config. `imagesBase` controls where co-located article images resolve.
//   - Default `/_content` serves the mirrored copies from static (method 3b, works now).
//   - Once R2 + Image Transformations is set up, set IMAGES_BASE to an absolute
//     Transformations URL prefix, e.g.
//       https://blog.etak64n.dev/cdn-cgi/image/format=auto,width=1200/https://images.etak64n.dev
//     so markdown/thumbnail images are served optimized from R2.
const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);

export const siteUrl = env.PUBLIC_SITE_URL || 'https://blog.etak64n.dev';
export const imagesBase = env.IMAGES_BASE || '/_content';
export const siteTitle = "etak64n's blog";
