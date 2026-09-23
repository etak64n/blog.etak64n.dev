/**
 * Makes Sveltia CMS work under the Content-Security-Policy that the etak64n.dev zone sends for
 * /admin. The policy is a Cloudflare Transform Rule, not part of this repository, so these shims
 * adapt the admin page to it instead of loosening it.
 *
 * Preview pane: the policy has no `frame-src`, so frames fall back to `default-src 'self'`, and
 * `'self'` never matches `blob:` URLs. As soon as a preview style or template is registered,
 * Sveltia builds the pane's document as a `text/html` Blob and loads it with
 * `iframe.src = URL.createObjectURL(blob)`, which the policy blocks. The shim below hands the same
 * HTML to the iframe through `srcdoc` instead. A srcdoc document is not fetched, so `frame-src` does
 * not apply, and it inherits the admin page's origin and policy just like the blob document would.
 * Only `text/html` Blob URLs assigned to an iframe's `src` property are rerouted.
 *
 * Scripts from unpkg.com are handled separately by the import map in index.html.
 *
 * Both workarounds become unnecessary if the zone policy for /admin gains
 * `frame-src 'self' blob:` and `https://unpkg.com` in `script-src`.
 */

/** Blob URL → Blob, for every `text/html` Blob turned into a URL on this page. */
const htmlBlobs = new Map();

const nativeCreateObjectURL = URL.createObjectURL;
const nativeRevokeObjectURL = URL.revokeObjectURL;

URL.createObjectURL = function createObjectURL(object) {
  const url = nativeCreateObjectURL.call(URL, object);

  if (object instanceof Blob && object.type === 'text/html') {
    htmlBlobs.set(url, object);
  }

  return url;
};

URL.revokeObjectURL = function revokeObjectURL(url) {
  htmlBlobs.delete(url);
  nativeRevokeObjectURL.call(URL, url);
};

const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');

Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
  ...srcDescriptor,
  set(value) {
    const blob = htmlBlobs.get(String(value));

    if (!blob) {
      srcDescriptor.set.call(this, value);

      return;
    }

    htmlBlobs.delete(String(value));

    // Reading a Blob is asynchronous. Sveltia registers its `load` listener before assigning
    // `src`, and the srcdoc navigation fires `load` once the document is ready, so it still
    // mounts the preview at the right time.
    blob.text().then(
      (html) => {
        this.srcdoc = html;
      },
      (error) => {
        console.error('[csp-compat] could not read the preview document', error);
      },
    );
  },
});
