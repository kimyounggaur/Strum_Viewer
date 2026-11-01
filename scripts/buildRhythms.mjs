/**
 * scripts/rhythms.source.json → src/data/strumRhythms.generated.ts
 *
 * 카테고리별 고정 박자 정보(박자표·beatsPerBar·pulseNote)는 src/data/categories.json의
 * timeSignature·grid에서 읽는다(카테고리 정의는 한 곳에만 둔다).
 * step 범위를 벗어난 스트로크는 조용히 버리지 않고 오류로 멈춘다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeConfidence } from './lib/rhythmMeta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(__dirname, 'rhythms.source.json');
const categoriesPath = path.join(projectRoot, 'src', 'data', 'categories.json');
const dataTarget = path.join(projectRoot, 'src', 'data', 'strumRhythms.generated.ts');

const FEEL_TIMINGS = new Set(['straight', 'swing', 'triplet', 'compound']);
const DIRS = new Set(['down', 'up', 'rest', 'mute']);

function parseId(id) {
  const match = /^(.*)_ex(\d+)$/.exec(id);
  if (!match) throw new Error(`잘못된 리듬 id "${id}" (형식: "<category>_exNN")`);
  return { categoryId: match[1], exNo: Number(match[2]) };
}

async function main() {
  const raw = JSON.parse(await readFile(sourcePath, 'utf8'));
  const categories = JSON.parse(await readFile(categoriesPath, 'utf8'));
  const categoryOrder = categories.map((category) => category.id);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const errors = [];
  const warnings = [];
  const seenIds = new Set();

  const entries = raw.map((src) => {
    const { categoryId, exNo } = parseId(src.id);
    const category = categoryById.get(categoryId);
    if (!category) throw new Error(`${src.id}: categories.json에 없는 카테고리 "${categoryId}"`);
    if (seenIds.has(src.id)) errors.push(`${src.id}: id 중복`);
    seenIds.add(src.id);
    if (!FEEL_TIMINGS.has(src.feelTiming)) errors.push(`${src.id}: feelTiming "${src.feelTiming}"`);

    const [numerator, denominator] = category.timeSignature.split('/').map(Number);
    const bars = Math.max(1, Math.round(src.bars ?? 1));
    const cells = category.grid.beatsPerBar * bars * src.subdivision;

    const strokes = [...(src.strokes ?? [])].sort((a, b) => a.step - b.step);
    for (const stroke of strokes) {
      if (!Number.isInteger(stroke.step) || stroke.step < 0 || stroke.step >= cells) {
        errors.push(
          `${src.id}: step=${stroke.step} 범위 밖 (0..${cells - 1}, subdivision=${src.subdivision}, bars=${bars})`,
        );
      }
      if (!DIRS.has(stroke.dir)) errors.push(`${src.id}: dir "${stroke.dir}"`);
    }
    for (let i = 1; i < strokes.length; i += 1) {
      if (strokes[i].step === strokes[i - 1].step)
        errors.push(`${src.id}: step ${strokes[i].step} 중복`);
    }
    if (strokes.length === 0) warnings.push(`${src.id}: 스트로크가 없습니다`);

    const { confidence, source } = normalizeConfidence(src.confidence);
    if (confidence !== 'verified') warnings.push(`${src.id}: 검수 전 근사치(${src.confidence})`);

    return {
      id: src.id,
      categoryId,
      exNo,
      rhythm: {
        timeSignature: [numerator, denominator],
        pulseNote: category.grid.pulseNote,
        beatsPerBar: category.grid.beatsPerBar,
        subdivision: src.subdivision,
        bars,
        feelTiming: src.feelTiming,
        swing: src.swing,
        imageLeftPad: src.imageLeftPad,
        imageRightPad: src.imageRightPad,
        confidence,
        source,
        note: src.note,
        strokes,
      },
    };
  });

  if (errors.length) {
    for (const error of errors) console.error(`✖ ${error}`);
    throw new Error(`rhythms.source.json: ${errors.length}개 오류로 중단했습니다.`);
  }

  entries.sort(
    (a, b) =>
      categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId) || a.exNo - b.exNo,
  );

  const stringifyStroke = (stroke) => {
    const parts = [`step: ${stroke.step}`, `dir: '${stroke.dir}'`];
    if (stroke.accent) parts.push('accent: true');
    if (stroke.tie) parts.push('tie: true');
    if (stroke.durationSteps != null) parts.push(`durationSteps: ${stroke.durationSteps}`);
    if (stroke.xNorm != null) parts.push(`xNorm: ${stroke.xNorm}`);
    return `{ ${parts.join(', ')} }`;
  };

  const stringifyRhythm = (rhythm) => {
    const lines = [
      `    timeSignature: [${rhythm.timeSignature[0]}, ${rhythm.timeSignature[1]}],`,
      `    pulseNote: '${rhythm.pulseNote}',`,
      `    beatsPerBar: ${rhythm.beatsPerBar},`,
      `    subdivision: ${rhythm.subdivision},`,
      `    bars: ${rhythm.bars},`,
      `    feelTiming: '${rhythm.feelTiming}',`,
    ];
    if (rhythm.swing != null) lines.push(`    swing: ${rhythm.swing},`);
    lines.push(`    imageLeftPad: ${rhythm.imageLeftPad},`);
    lines.push(`    imageRightPad: ${rhythm.imageRightPad},`);
    lines.push(`    confidence: '${rhythm.confidence}',`);
    lines.push(`    source: '${rhythm.source}',`);
    if (rhythm.note) lines.push(`    note: ${JSON.stringify(rhythm.note)},`);
    lines.push('    strokes: [');
    for (const stroke of rhythm.strokes) lines.push(`      ${stringifyStroke(stroke)},`);
    lines.push('    ],');
    return lines.join('\n');
  };

  const body = entries
    .map((entry) => `  '${entry.id}': {\n${stringifyRhythm(entry.rhythm)}\n  },`)
    .join('\n');

  const out = `// AUTO-GENERATED by scripts/buildRhythms.mjs from scripts/rhythms.source.json.
// 직접 고치지 말고 JSON을 고친 뒤 \`npm run prepare:rhythms\`를 실행하세요.
import type { StrumRhythm } from './strumTypes';

export const strumRhythms: Record<string, StrumRhythm> = {
${body}
};
`;

  await writeFile(dataTarget, out, 'utf8');

  const counts = {};
  for (const entry of entries) counts[entry.categoryId] = (counts[entry.categoryId] ?? 0) + 1;
  console.log(`Generated ${entries.length} rhythms ->`, counts);
  if (warnings.length) {
    console.warn(`\n${warnings.length}개 경고:`);
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
