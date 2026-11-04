/**
 * Reads the top-level `key: value` lines of a post's front matter without a YAML parser. That is
 * enough for the one-line values (title, date, draft, hero) that the editor at /admin/ lists and
 * checks; lists such as `tags` are not read. The editor's API (functions/) uses it too, so this
 * module must not import anything.
 */

const BLOCK = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const FIELD = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/;

/** The front matter's one-line values by key; empty when the text has no front matter. */
export function frontmatterFields(text: string): Map<string, string> {
  const fields = new Map<string, string>();
  const block = BLOCK.exec(text);
  if (!block) return fields;
  for (const line of block[1].split(/\r?\n/)) {
    const field = FIELD.exec(line);
    if (field) fields.set(field[1], scalar(field[2]));
  }
  return fields;
}

/** A YAML scalar written on one line: quoted (`"…"`, `'…'`) or plain, without a trailing comment. */
function scalar(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"')) {
    const end = value.lastIndexOf('"');
    try {
      return JSON.parse(value.slice(0, end + 1)) as string;
    } catch {
      return value.slice(1, end > 0 ? end : undefined);
    }
  }
  if (value.startsWith("'")) {
    const end = value.lastIndexOf("'");
    return value.slice(1, end > 0 ? end : undefined).replaceAll("''", "'");
  }
  return value.replace(/[ \t]+#.*$/, '');
}
