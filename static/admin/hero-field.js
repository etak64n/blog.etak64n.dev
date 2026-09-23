/**
 * `hero-ai` field type: the article's hero image, with a button that asks the site's own
 * `/api/admin/hero` endpoint (a Pages Function backed by Workers AI) to generate one from the
 * title, tags and body. The result is fitted to 1200x630 WebP in the browser and handed to the
 * CMS with `addFile`, so it is committed together with the entry like any uploaded image.
 *
 * The stored value stays a plain path string (`/images/hero/<name>.webp`), which is what the
 * Zola templates expect in `extra.hero`.
 */
import { toHeroWebp } from './hero-image.js';

const PLACEHOLDER = '/images/hero/placeholder.svg';
const DEFAULT_ENDPOINT = '/api/admin/hero';
const STORAGE_KEY = 'blog-admin-api-key';

const storage = {
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  },
  set(value) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode etc.: the key just has to be re-entered next time.
    }
  },
};

const toArray = (value) => {
  if (!value) return [];
  if (typeof value.toJS === 'function') return value.toJS();

  return Array.isArray(value) ? value : [value];
};

const timestamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-');

/** File name for the generated image: `<slug>-hero.webp`, or a timestamp when the slug is unknown. */
function heroFileName(entry) {
  const slug = String(entry?.get?.('slug') || '');
  const title = String(entry?.getIn?.(['data', 'title']) || '');
  const base = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return base ? `${base}-hero.webp` : `hero-${timestamp()}.webp`;
}

const button = (label, onClick, { disabled = false, primary = false } = {}) =>
  h(
    'button',
    {
      type: 'button',
      onClick,
      disabled,
      style: {
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid var(--control-border-color, #cbd5e1)',
        background: primary ? 'var(--primary-accent-color, #2563eb)' : 'transparent',
        color: primary ? '#fff' : 'inherit',
        cursor: disabled ? 'progress' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      },
    },
    label,
  );

const HeroControl = createClass({
  getInitialState: function () {
    return { busy: false, error: '', prompt: '', hint: '', keyInput: '', hasKey: Boolean(storage.get()) };
  },

  saveKey: function () {
    const value = this.state.keyInput.trim();

    storage.set(value);
    this.setState({ hasKey: Boolean(value), keyInput: '', error: '' });
  },

  forgetKey: function () {
    storage.set('');
    this.setState({ hasKey: false });
  },

  pick: async function () {
    try {
      const picked = await this.props.pickFile({ kind: 'image' });

      if (picked?.value) this.props.onChange(picked.value);
    } catch (error) {
      this.setState({ error: error.message });
    }
  },

  reset: function () {
    this.props.onChange(this.props.field.get('default') || PLACEHOLDER);
  },

  generate: async function () {
    const key = storage.get();

    if (!key) {
      this.setState({ error: '先に管理 API キーを保存してください' });

      return;
    }

    const { entry, field } = this.props;
    const endpoint = field.get('endpoint') || DEFAULT_ENDPOINT;
    const payload = {
      title: String(entry?.getIn?.(['data', 'title']) || ''),
      tags: toArray(entry?.getIn?.(['data', 'taxonomies', 'tags'])),
      body: String(entry?.getIn?.(['data', 'body']) || '').slice(0, 1500),
      hint: this.state.hint.trim(),
    };

    this.setState({ busy: true, error: '' });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        storage.set('');
        this.setState({ hasKey: false });
        throw new Error('API キーが違います。入力し直してください');
      }

      if (!response.ok) {
        let message = `HTTP ${response.status}`;

        try {
          const data = await response.json();

          if (data.error) message = data.error;
        } catch {
          // Not JSON: keep the status code.
        }

        throw new Error(message);
      }

      const prompt = decodeURIComponent(response.headers.get('X-Hero-Prompt') || '');
      const webp = await toHeroWebp(await response.blob());
      const url = await this.props.addFile(webp, { name: heroFileName(entry) });

      this.props.onChange(url);
      this.setState({ prompt, busy: false });
    } catch (error) {
      this.setState({ error: error.message, busy: false });
    }
  },

  render: function () {
    const { value, forID } = this.props;
    const { busy, error, prompt, hint, keyInput, hasKey } = this.state;
    const src = value || PLACEHOLDER;

    return h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      h('img', {
        src,
        alt: '',
        style: { width: '100%', maxWidth: '480px', aspectRatio: '1200 / 630', objectFit: 'cover', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9' },
      }),
      h('div', { style: { fontSize: '0.85em', wordBreak: 'break-all', opacity: 0.8 } }, value || '(未設定)'),
      h(
        'div',
        { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        button(busy ? '生成中…' : 'AI で生成', this.generate, { disabled: busy, primary: true }),
        button('画像を選ぶ', this.pick, { disabled: busy }),
        button('プレースホルダーに戻す', this.reset, { disabled: busy }),
      ),
      h('input', {
        id: forID,
        type: 'text',
        value: hint,
        placeholder: 'AI への追加指示 (任意。例: 紫のゲームボーイを中央に)',
        onChange: (event) => this.setState({ hint: event.target.value }),
        style: { padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px' },
      }),
      hasKey
        ? h(
            'div',
            { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85em', opacity: 0.8 } },
            '管理 API キー: 保存済み',
            button('削除', this.forgetKey),
          )
        : h(
            'div',
            { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            h('input', {
              type: 'password',
              value: keyInput,
              placeholder: '管理 API キー (初回のみ。ブラウザに保存)',
              autoComplete: 'off',
              onChange: (event) => this.setState({ keyInput: event.target.value }),
              style: { flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px' },
            }),
            button('保存', this.saveKey, { disabled: !keyInput.trim() }),
          ),
      error ? h('p', { style: { color: '#dc2626', margin: 0 } }, error) : null,
      prompt ? h('p', { style: { fontSize: '0.8em', margin: 0, opacity: 0.75, userSelect: 'text' } }, `prompt: ${prompt}`) : null,
    );
  },
});

const HeroPreview = createClass({
  render: function () {
    return h('img', { src: this.props.value || PLACEHOLDER, alt: '', style: { maxWidth: '100%' } });
  },
});

const schema = {
  properties: {
    endpoint: { type: 'string' },
  },
};

export function registerHeroField() {
  CMS.registerFieldType('hero-ai', HeroControl, HeroPreview, schema);
}
