// Expressive Code renders the code blocks of posts: syntax highlighting, file name tabs, terminal
// frames, copy buttons, line markers and optional line numbers. Code blocks are dark (Nord) in both
// page themes, with an editor-like tab bar for file names.
// https://expressive-code.com/reference/configuration/
import { defineEcConfig, pluginFramesTexts } from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

pluginFramesTexts.addLocale('ja', {
  terminalWindowFallbackTitle: 'ターミナル',
  copyButtonTooltip: 'コピー',
  copyButtonCopied: 'コピーしました',
});

const BORDER = 'rgba(148,163,184,0.15)';

export default defineEcConfig({
  defaultLocale: 'ja',
  themes: ['nord'],
  plugins: [pluginLineNumbers()],
  defaultProps: {
    // Opt in per block with `showLineNumbers`.
    showLineNumbers: false,
  },
  styleOverrides: {
    borderRadius: '4px',
    borderColor: BORDER,
    codeFontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    codeFontSize: '0.85rem',
    codeLineHeight: '1.5',
    codePaddingBlock: '14px',
    codePaddingInline: '16px',
    uiFontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    uiFontSize: '0.8rem',
    frames: {
      frameBoxShadowCssValue: 'none',
      editorTabBarBackground: '#242933',
      editorTabBarBorderColor: BORDER,
      editorTabBarBorderBottomColor: 'transparent',
      editorTabBorderRadius: '3px',
      editorActiveTabBackground: '#2e3440',
      editorActiveTabForeground: '#d8dee9',
      editorActiveTabBorderColor: 'transparent',
      editorActiveTabIndicatorTopColor: '#88c0d0',
      editorActiveTabIndicatorBottomColor: 'transparent',
      editorActiveTabIndicatorHeight: '2px',
      terminalTitlebarBackground: '#242933',
      terminalTitlebarBorderBottomColor: BORDER,
      terminalTitlebarForeground: '#d8dee9',
      terminalBackground: '#2e3440',
    },
  },
});
