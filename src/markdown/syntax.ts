/**
 * The meanings this blog gives to plain Markdown, shared by the Markdown plugins (mdast.ts) and the
 * editor at /admin/ (src/admin/live-preview.ts), which shows posts the way the site does. Runs in
 * the browser too, so this module must not import anything.
 */

/** The class (colour and icon, in global.css) and the name read out by screen readers of each alert. */
export const CALLOUTS = {
  note: { className: 'note-info', label: '補足' },
  tip: { className: 'note-tip', label: 'ヒント' },
  important: { className: 'note-important', label: '重要' },
  warning: { className: 'note-warn', label: '注意' },
  caution: { className: 'note-alert', label: '警告' },
} as const;

export type CalloutType = keyof typeof CALLOUTS;

/** `[!NOTE]` alone on the first line of a blockquote, as in GitHub's alerts. */
export const CALLOUT_MARKER = /^\[!(note|tip|important|warning|caution)\][^\S\n]*(?:\n|$)/i;

/** The line naming the source of a quotation, e.g. `出典: [タイトル](https://example.com/)`. */
export const SOURCE_LINE = /^出典[:：]/;
