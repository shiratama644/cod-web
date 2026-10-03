/**
 * commitlint 設定(TEMPLATE_REPO 由来・cod-web 適合版)。
 * AGENTS.md の Conventional Commits 規約を commit-msg hook で機械的に強制する。
 * 日本語 subject/body を許可するため subject-case は無効化。
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 日本語 subject を許可(英語小文字強制を無効化)
    'subject-case': [0, 'never'],
    // 本文・フッターは警告のみ(詳細な日本語報告を妨げない)
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
}
