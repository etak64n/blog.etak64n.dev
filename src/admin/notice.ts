/** Messages on the editor's pages, shown in the site's note boxes (`.note` in src/styles/global.css). */

export type NoticeKind = 'info' | 'tip' | 'warn' | 'alert';

/** Replaces the message in `container`; `parts` follow the text (links, buttons). */
export function showNotice(container: HTMLElement, kind: NoticeKind, text: string, ...parts: (string | Node)[]): void {
  const note = document.createElement('div');
  note.className = `note note-${kind}`;
  note.setAttribute('role', kind === 'alert' || kind === 'warn' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = 'note-icon';
  icon.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div');
  body.className = 'note-body';
  const paragraph = document.createElement('p');
  paragraph.append(text, ...parts);
  body.append(paragraph);
  note.append(icon, body);
  container.replaceChildren(note);
}

export function clearNotice(container: HTMLElement): void {
  container.replaceChildren();
}

export const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The element with the ID `id`, which the page's HTML must have. */
export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} がページにありません`);
  return found as T;
}
