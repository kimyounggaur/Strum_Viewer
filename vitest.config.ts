import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // 순수 함수 테스트가 기본. 훅/컴포넌트 테스트 파일은 상단에
    // `// @vitest-environment jsdom` 지시자를 둔다.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/audio/**', 'src/hooks/**'],
    },
  },
});
