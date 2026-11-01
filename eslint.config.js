import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'public',
    'node_modules',
    'coverage',
    'src/data/*.generated.ts',
    'src/data/strumRhythms.ts',
  ]),

  // 앱 소스: 타입 정보 기반 규칙
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `void transport.toggle()` 처럼 의도적으로 버리는 Promise는 void로 표시한다.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // onClick={asyncFn} 패턴은 Phase 1에서 정리한다. 그때까지는 경고로 둔다.
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // 테스트 파일: 스냅샷·픽스처에서 유연하게
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Node 스크립트·JS 설정 파일: 타입 정보 없이
  {
    files: ['scripts/**/*.mjs', '*.config.{js,mjs}', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },

  // TS 설정 파일(vite/tailwind/vitest): 타입 정보 없이 TS 파서만
  {
    files: ['*.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node },
  },
]);
