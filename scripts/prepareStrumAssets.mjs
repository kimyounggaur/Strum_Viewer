import { mkdir, readdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, '스트럼 Source');
const publicRoot = path.join(projectRoot, 'public', 'strums');
const dataTarget = path.join(projectRoot, 'src', 'data', 'strumPatterns.generated.ts');

const categories = [
  {
    id: 'sixteen-beat-variation',
    folder: '스트럼(16Beat Variation)-[개별]',
    labelKo: '16비트 변형',
    labelEn: '16Beat Variation',
    timeSignature: '4/4',
    feel: 'sixteenth',
    recommendedBpm: { min: 60, max: 120, default: 82 },
    tags: ['16beat', 'variation', 'pop', 'worship'],
  },
  {
    id: 'three-four',
    folder: '스트럼(4분의 3박)-[개별]',
    labelKo: '4분의 3박',
    labelEn: '3/4 Strum',
    timeSignature: '3/4',
    feel: 'straight',
    recommendedBpm: { min: 60, max: 130, default: 90 },
    tags: ['3/4', 'waltz'],
  },
  {
    id: 'twelve-eight',
    folder: '스트럼(8분의 12박)-[개별]',
    labelKo: '8분의 12박',
    labelEn: '12/8 Strum',
    timeSignature: '12/8',
    feel: 'triplet',
    recommendedBpm: { min: 45, max: 100, default: 66 },
    tags: ['12/8', 'triplet', 'ballad'],
  },
  {
    id: 'six-eight',
    folder: '스트럼(8분의 6박)-[개별]',
    labelKo: '8분의 6박',
    labelEn: '6/8 Strum',
    timeSignature: '6/8',
    feel: 'triplet',
    recommendedBpm: { min: 50, max: 120, default: 76 },
    tags: ['6/8', 'triplet'],
  },
  {
    id: 'shuffle',
    folder: '스트럼(Shuffle)-[개별]',
    labelKo: '셔플',
    labelEn: 'Shuffle',
    timeSignature: '4/4',
    feel: 'shuffle',
    recommendedBpm: { min: 60, max: 140, default: 96 },
    tags: ['shuffle', 'swing'],
  },
  {
    id: 'slow-gogo',
    folder: '스트럼(슬로우 고고)-[개별]',
    labelKo: '슬로우 고고',
    labelEn: 'Slow GoGo',
    timeSignature: '4/4',
    feel: 'slow',
    recommendedBpm: { min: 55, max: 105, default: 74 },
    tags: ['slow', 'gogo'],
  },
  {
    id: 'slow-rock',
    folder: '스트럼(슬로우 락)-[개별]',
    labelKo: '슬로우 락',
    labelEn: 'Slow Rock',
    timeSignature: '4/4',
    feel: 'triplet',
    recommendedBpm: { min: 45, max: 95, default: 64 },
    tags: ['slow rock', 'triplet'],
  },
  {
    id: 'calypso',
    folder: '스트럼(칼립소)-[개별]',
    labelKo: '칼립소',
    labelEn: 'Calypso',
    timeSignature: '4/4',
    feel: 'latin',
    recommendedBpm: { min: 70, max: 140, default: 104 },
    tags: ['calypso', 'latin', 'syncopation'],
  },
  {
    id: 'country',
    folder: '스트럼(컨트리)-[개별]',
    labelKo: '컨트리',
    labelEn: 'Country',
    timeSignature: '4/4',
    feel: 'country',
    recommendedBpm: { min: 70, max: 150, default: 112 },
    tags: ['country', 'accent'],
  },
];

function padExercise(no) {
  return String(no).padStart(2, '0');
}

function extractExerciseNo(fileName) {
  const matches = [...fileName.matchAll(/(?:Ex|EX)\s*0*(\d+)/g)];
  const last = matches.at(-1);

  if (!last) {
    throw new Error(`Cannot extract exercise number from "${fileName}"`);
  }

  return Number(last[1]);
}

function difficultyFor(exerciseNo) {
  if (exerciseNo <= 3) return 'beginner';
  if (exerciseNo <= 8) return 'intermediate';
  return 'advanced';
}

async function readPngSize(filePath) {
  const buffer = await readFile(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');

  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function patternTags(category, exerciseNo) {
  return [
    ...category.tags,
    category.labelKo,
    category.labelEn,
    category.timeSignature,
    category.feel,
    `ex${padExercise(exerciseNo)}`,
    `ex-${exerciseNo}`,
  ];
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
  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });

  const patterns = [];

  for (const category of categories) {
    const sourceDir = path.join(sourceRoot, category.folder);
    const targetDir = path.join(publicRoot, category.id);
    await mkdir(targetDir, { recursive: true });

    const files = (await readdir(sourceDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
      .map((entry) => entry.name)
      .sort((a, b) => extractExerciseNo(a) - extractExerciseNo(b));

    for (const fileName of files) {
      const exerciseNo = extractExerciseNo(fileName);
      const displayNo = `Ex${padExercise(exerciseNo)}`;
      const targetFileName = `ex${padExercise(exerciseNo)}.png`;
      const sourcePath = path.join(sourceDir, fileName);
      const targetPath = path.join(targetDir, targetFileName);
      const { width, height } = await readPngSize(sourcePath);

      await copyFile(sourcePath, targetPath);

      patterns.push({
        id: `${category.id}_ex${padExercise(exerciseNo)}`,
        categoryId: category.id,
        title: `${category.labelEn} Ex-${exerciseNo}`,
        exerciseNo,
        displayNo,
        originalFileName: fileName,
        imageSrc: `/strums/${category.id}/${targetFileName}`,
        width,
        height,
        timeSignature: category.timeSignature,
        feel: category.feel,
        difficulty: difficultyFor(exerciseNo),
        recommendedBpm: category.recommendedBpm,
        tags: patternTags(category, exerciseNo),
      });
    }
  }

  patterns.sort((a, b) => {
    const aCategoryIndex = categories.findIndex((category) => category.id === a.categoryId);
    const bCategoryIndex = categories.findIndex((category) => category.id === b.categoryId);
    return aCategoryIndex - bCategoryIndex || a.exerciseNo - b.exerciseNo;
  });

  const generated = `import type { StrumPattern } from './strumTypes';

export const strumPatternsGenerated: StrumPattern[] = ${JSON.stringify(patterns, null, 2)};
`;

  await writeFile(dataTarget, generated, 'utf8');
  await writePlaceholder();

  const categorySummary = categories
    .map((category) => {
      const count = patterns.filter((pattern) => pattern.categoryId === category.id).length;
      return `${category.id}:${count}`;
    })
    .join(', ');

  console.log(`Prepared ${patterns.length} strum PNG assets.`);
  console.log(categorySummary);

  if (patterns.length !== 76) {
    throw new Error(`Expected 76 PNG files but prepared ${patterns.length}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
