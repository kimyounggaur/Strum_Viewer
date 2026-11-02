/**
 * `스트럼 Source/`의 PNG를 스캔해 public/strums/{categoryId}/exNN.png로 복사하고,
 * 썸네일(WebP)과 src/data/strumPatterns.generated.ts(매니페스트)를 만든다.
 *
 * 입력(원본):
 *   src/data/categories.json          카테고리 정의 (앱과 공용)
 *   scripts/rhythms.source.json       리듬 전사 (난이도·세는 느낌 유도에 사용)
 *   src/data/patterns.overrides.json  패턴별 수동 메타 (난이도·메모·태그)
 *
 * 옵션:
 *   --strict     카테고리별 expectedCount 불일치·리듬 누락을 오류로 처리
 *   --no-thumbs  썸네일 생성을 건너뜀 (thumbSrc = 원본)
 */
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractExerciseNo, readPngSize } from './lib/png.mjs';
import { countingFeelOf, difficultyFromScore, difficultyScore } from './lib/rhythmMeta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, '스트럼 Source');
const publicRoot = path.join(projectRoot, 'public', 'strums');
const dataTarget = path.join(projectRoot, 'src', 'data', 'strumPatterns.generated.ts');

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const withThumbs = !args.has('--no-thumbs');
const THUMB_WIDTH = 640;

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (fallback !== undefined && error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const pad2 = (no) => String(no).padStart(2, '0');

async function loadThumbnailer() {
  if (!withThumbs) return null;
  try {
    const { default: sharp } = await import('sharp');
    return async (input, output) => {
      await sharp(input)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(output);
    };
  } catch {
    console.warn('⚠ sharp를 불러올 수 없어 썸네일 없이 진행합니다 (thumbSrc = 원본 PNG).');
    return null;
  }
}

async function writePlaceholder() {
  const placeholderDir = path.join(publicRoot, 'placeholders');
  await mkdir(placeholderDir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360" role="img" aria-label="Pattern image unavailable">
  <rect width="900" height="360" fill="#ffffff"/>
  <rect x="24" y="24" width="852" height="312" rx="18" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M130 178H770" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
  <path d="M184 126l-42 92M274 126l-42 92M364 126l-42 92M454 126l-42 92M544 126l-42 92M634 126l-42 92M724 126l-42 92" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
  <text x="450" y="286" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="32" font-weight="700">Image unavailable</text>
</svg>`;
  await writeFile(path.join(placeholderDir, 'pattern-placeholder.svg'), svg, 'utf8');
}

async function main() {
  const categories = await readJson(path.join(projectRoot, 'src', 'data', 'categories.json'));
  const rhythmList = await readJson(path.join(__dirname, 'rhythms.source.json'), []);
  const overrides = await readJson(
    path.join(projectRoot, 'src', 'data', 'patterns.overrides.json'),
    {},
  );
  const rhythmById = new Map(rhythmList.map((entry) => [entry.id, entry]));
  const thumbnail = await loadThumbnailer();

  const warnings = [];
  const errors = [];

  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });

  const patterns = [];

  for (const category of categories) {
    const sourceDir = path.join(sourceRoot, category.folder);
    const targetDir = path.join(publicRoot, category.id);
    const thumbDir = path.join(targetDir, 'thumbs');
    await mkdir(thumbDir, { recursive: true });

    let entries;
    try {
      entries = await readdir(sourceDir, { withFileTypes: true });
    } catch {
      warnings.push(`${category.id}: 원본 폴더가 없습니다 → "${category.folder}"`);
      continue;
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
      .map((entry) => ({ name: entry.name, exerciseNo: extractExerciseNo(entry.name) }))
      .sort((a, b) => a.exerciseNo - b.exerciseNo);

    // 같은 Ex 번호가 둘이면 조용히 덮어쓰지 않고 멈춘다.
    const seen = new Map();
    for (const file of files) {
      if (seen.has(file.exerciseNo)) {
        errors.push(
          `${category.id}: Ex${pad2(file.exerciseNo)} 중복 → "${seen.get(file.exerciseNo)}", "${file.name}"`,
        );
      }
      seen.set(file.exerciseNo, file.name);
    }

    if (category.expectedCount != null && files.length !== category.expectedCount) {
      warnings.push(`${category.id}: 예상 ${category.expectedCount}개, 실제 ${files.length}개`);
    }

    for (const { name, exerciseNo } of files) {
      const id = `${category.id}_ex${pad2(exerciseNo)}`;
      const fileStem = `ex${pad2(exerciseNo)}`;
      const sourcePath = path.join(sourceDir, name);
      const { width, height } = await readPngSize(sourcePath);
      await copyFile(sourcePath, path.join(targetDir, `${fileStem}.png`));

      let thumbSrc = `/strums/${category.id}/${fileStem}.png`;
      if (thumbnail) {
        await thumbnail(sourcePath, path.join(thumbDir, `${fileStem}.webp`));
        thumbSrc = `/strums/${category.id}/thumbs/${fileStem}.webp`;
      }

      const rhythm = rhythmById.get(id);
      if (!rhythm) warnings.push(`${id}: 리듬 데이터가 없습니다(클릭 전용으로 재생됨)`);
      const override = overrides[id] ?? {};

      const difficulty =
        override.difficulty ??
        (rhythm
          ? difficultyFromScore(difficultyScore(rhythm, category.grid.beatsPerBar))
          : 'intermediate');

      patterns.push({
        id,
        categoryId: category.id,
        title: `${category.labelEn} Ex-${exerciseNo}`,
        titleKo: `${category.labelKo} Ex${pad2(exerciseNo)}`,
        exerciseNo,
        displayNo: `Ex${pad2(exerciseNo)}`,
        originalFileName: name,
        imageSrc: `/strums/${category.id}/${fileStem}.png`,
        thumbSrc,
        width,
        height,
        timeSignature: category.timeSignature,
        countingFeel: countingFeelOf(rhythm) ?? category.countingFeel,
        difficulty,
        difficultySource: override.difficulty ? 'manual' : 'auto',
        recommendedBpm: override.recommendedBpm ?? category.recommendedBpm,
        tags: [
          ...category.tags,
          category.labelKo,
          category.labelEn,
          category.timeSignature,
          `ex${pad2(exerciseNo)}`,
          `ex${exerciseNo}`,
          ...(override.tags ?? []),
        ],
        ...(override.notes ? { notes: override.notes } : {}),
      });
    }
  }

  for (const id of Object.keys(overrides)) {
    if (!patterns.some((pattern) => pattern.id === id)) {
      warnings.push(`patterns.overrides.json: 존재하지 않는 패턴 id "${id}"`);
    }
  }

  if (errors.length) {
    for (const error of errors) console.error(`✖ ${error}`);
    throw new Error(`${errors.length}개 오류로 중단했습니다.`);
  }

  const generated = `// AUTO-GENERATED by scripts/prepareStrumAssets.mjs — 직접 고치지 마세요.
// 원본: 스트럼 Source/, src/data/categories.json, scripts/rhythms.source.json, src/data/patterns.overrides.json
import type { StrumPatternManifest } from './strumTypes';

export const strumPatternsGenerated: StrumPatternManifest[] = ${JSON.stringify(patterns, null, 2)};
`;
  await writeFile(dataTarget, generated, 'utf8');
  await writePlaceholder();

  const summary = categories
    .map(
      (category) => `${category.id}:${patterns.filter((p) => p.categoryId === category.id).length}`,
    )
    .join(', ');
  console.log(
    `Prepared ${patterns.length} strum PNG assets${thumbnail ? ' (+ WebP thumbnails)' : ''}.`,
  );
  console.log(summary);

  if (warnings.length) {
    console.warn(`\n${warnings.length}개 경고:`);
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
    if (strict) throw new Error('--strict: 경고가 있어 중단합니다.');
  }

  if (thumbnail) {
    let original = 0;
    let thumbs = 0;
    for (const pattern of patterns) {
      original += (await stat(path.join(projectRoot, 'public', pattern.imageSrc))).size;
      thumbs += (await stat(path.join(projectRoot, 'public', pattern.thumbSrc))).size;
    }
    console.log(
      `썸네일 합계 ${(thumbs / 1024).toFixed(0)}KB (원본 ${(original / 1024).toFixed(0)}KB)`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
