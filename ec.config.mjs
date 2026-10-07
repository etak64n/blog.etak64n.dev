// Expressive Code renders the code blocks of posts: syntax highlighting, file name tabs, terminal
// frames, copy buttons, line markers and optional line numbers.
// https://expressive-code.com/reference/configuration/
import { defineEcConfig, pluginFramesTexts } from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

pluginFramesTexts.addLocale('ja', {
  terminalWindowFallbackTitle: 'ターミナル',
  copyButtonTooltip: 'コピー',
  copyButtonCopied: 'コピーしました',
});

export default defineEcConfig({
  defaultLocale: 'ja',
  // The first theme is used when no theme is selected; the page's theme switch sets
  // <html data-theme="light|dark">, which picks one of these by its type.
  themes: ['github-light', 'github-dark'],
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  useDarkModeMediaQuery: true,
  plugins: [pluginLineNumbers()],
  defaultProps: {
    // Opt in per block with `showLineNumbers`.
    showLineNumbers: false,
  },
  styleOverrides: {
    borderRadius: '0.5rem',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.7',
    uiFontFamily: 'var(--font-sans)',
    uiFontSize: '0.8125rem',
  },
});
