/**
 * Work not saved to GitHub yet, kept in this browser so that it survives closing the tab: the
 * post's text in localStorage, and images added to it in IndexedDB. Both are removed by a save.
 */

export interface Draft {
  text: string;
  /** SHA of GitHub's text when the editing started (`Post.sha`), null for a new post. */
  base: string | null;
}

const PREFIX = 'blog-editor:draft:';

export function readDraft(slug: string): Draft | undefined {
  try {
    const stored = localStorage.getItem(PREFIX + slug);
    return stored ? (JSON.parse(stored) as Draft) : undefined;
  } catch {
    return undefined;
  }
}

/** Returns false when the browser could not store it (storage full or unavailable). */
export function writeDraft(slug: string, draft: Draft): boolean {
  try {
    localStorage.setItem(PREFIX + slug, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(slug: string): void {
  try {
    localStorage.removeItem(PREFIX + slug);
  } catch {
    // Unavailable storage holds no draft.
  }
}

/** Slugs of the posts with a draft in this browser. */
export function draftSlugs(): string[] {
  const slugs: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) slugs.push(key.slice(PREFIX.length));
    }
  } catch {
    // Unavailable storage holds no draft.
  }
  return slugs;
}

/* Images: one IndexedDB record per image, keyed `<slug>/<file name>`. */

const DATABASE = 'blog-editor';
const STORE = 'images';

let database: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB を開けません'));
  });
  return database;
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await open()).transaction(STORE, mode).objectStore(STORE);
  return new Promise<T>((resolve, reject) => {
    const request = run(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB の操作に失敗しました'));
  });
}

const range = (slug: string) => IDBKeyRange.bound(`${slug}/`, `${slug}/\uffff`);

/** The images added to the post `slug` and not saved yet, by file name. */
export async function readImages(slug: string): Promise<Map<string, Blob>> {
  const [keys, blobs] = await Promise.all([
    transact('readonly', (store) => store.getAllKeys(range(slug))),
    transact('readonly', (store) => store.getAll(range(slug))),
  ]);
  const images = new Map<string, Blob>();
  keys.forEach((key, i) => images.set(String(key).slice(slug.length + 1), blobs[i] as Blob));
  return images;
}

export async function writeImage(slug: string, name: string, blob: Blob): Promise<void> {
  await transact('readwrite', (store) => store.put(blob, `${slug}/${name}`));
}

export async function removeImage(slug: string, name: string): Promise<void> {
  await transact('readwrite', (store) => store.delete(`${slug}/${name}`));
}
