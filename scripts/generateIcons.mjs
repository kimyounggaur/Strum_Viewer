/**
 * public/favicon.svg → 앱 아이콘 PNG와 공유 미리보기(OG) 이미지를 만든다.
 * 로고를 바꿨을 때만 수동 실행: `node scripts/generateIcons.mjs` (결과물은 커밋한다)
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => path.join(root, 'public', 'icons', name);
const logo = await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8');
// iOS·안드로이드 마스크용: 모서리 둥글림 없이 꽉 찬 배경 + 안전 영역 여백
const fullBleed = logo
  .replace('rx="14"', 'rx="0"')
  .replace(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 76 76"><rect x="-6" y="-6" width="76" height="76" fill="#0f766e"/>',
  );

await sharp(Buffer.from(logo)).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(Buffer.from(logo)).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(Buffer.from(fullBleed)).resize(512, 512).png().toFile(out('icon-maskable-512.png'));
await sharp(Buffer.from(fullBleed)).resize(180, 180).png().toFile(out('apple-touch-icon.png'));

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fbfbf8"/>
  <rect x="0" y="0" width="1200" height="12" fill="#0f766e"/>
  <g transform="translate(90 165) scale(3.2)">${logo.replace(/<\/?svg[^>]*>/g, '')}</g>
  <text x="380" y="232" font-family="Noto Sans CJK KR, sans-serif" font-size="40" font-weight="700" fill="#64748b">Lesson Designer</text>
  <text x="380" y="322" font-family="Noto Sans CJK KR, sans-serif" font-size="92" font-weight="900" fill="#172033">Strum Viewer</text>
  <text x="380" y="398" font-family="Noto Sans CJK KR, sans-serif" font-size="34" font-weight="500" fill="#334155">기타·우쿨렐레 스트럼 패턴을 보고 듣고 따라 치기</text>
  <g font-family="Noto Sans CJK KR, sans-serif" font-size="28" font-weight="700" fill="#0f766e">
    <text x="380" y="470">카테고리별 패턴 · 박자 맞춰 재생 · 확대 악보</text>
  </g>
</svg>`;
await sharp(Buffer.from(og)).png().toFile(out('og.png'));
await writeFile(out('.generated'), 'scripts/generateIcons.mjs\n');
console.log('icons written to public/icons/');
