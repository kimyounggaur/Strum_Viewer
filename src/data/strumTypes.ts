export type StrumCategoryId =
  | 'sixteen-beat-variation'
  | 'three-four'
  | 'twelve-eight'
  | 'six-eight'
  | 'shuffle'
  | 'slow-gogo'
  | 'slow-rock'
  | 'calypso'
  | 'country';

export type TimeSignature = '4/4' | '3/4' | '12/8' | '6/8';

/**
 * 학생이 "어떻게 세는지" (리듬 느낌). 장르(슬로우·라틴 등)는 tags로 분리했다.
 * 패턴별 값은 리듬 데이터(feelTiming + subdivision)에서 유도한다.
 */
export type CountingFeel = 'straight-8' | 'straight-16' | 'swing' | 'triplet' | 'compound';

export type FeelTiming = 'straight' | 'swing' | 'triplet' | 'compound';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type BpmRange = {
  min: number;
  max: number;
  default: number;
};

/** src/data/categories.json 한 항목 (스크립트와 앱이 같이 읽는 원본) */
export type StrumCategory = {
  id: StrumCategoryId;
  /** `스트럼 Source/` 아래 원본 폴더명 */
  folder: string;
  labelKo: string;
  labelEn: string;
  shortLabel: string;
  description: string;
  timeSignature: TimeSignature;
  /** 카테고리 대표 느낌 (패턴별 값은 리듬에서 유도) */
  countingFeel: CountingFeel;
  tags: string[];
  color: string;
  accentColor: string;
  recommendedBpm: BpmRange;
  grid: { beatsPerBar: number; pulseNote: 'quarter' | 'dotted-quarter' };
  /** 있으면 asset 스크립트가 개수 불일치를 경고한다 */
  expectedCount?: number;
};

export type StrokeDir = 'down' | 'up' | 'rest' | 'mute';

export type Stroke = {
  step: number;
  dir: StrokeDir;
  accent?: boolean;
  tie?: boolean;
  durationSteps?: number;
  /** 0..1 이미지 위 실제 x 좌표 (보정 도구로 채움) */
  xNorm?: number;
};

export type StrumRhythm = {
  timeSignature: [number, number];
  pulseNote: 'quarter' | 'dotted-quarter';
  beatsPerBar: number;
  subdivision: number;
  bars: number;
  feelTiming: FeelTiming;
  swing?: number;
  strokes: Stroke[];
  imageLeftPad?: number;
  imageRightPad?: number;
  /** 'approx' = 악보와 다를 수 있는 근사 전사 (UI에 표시) */
  confidence?: 'verified' | 'approx';
  source?: 'local' | 'remote';
  /** 전사자 메모 (개발용, 화면에 표시하지 않음) */
  note?: string;
};

/** prepareStrumAssets.mjs가 생성하는 매니페스트 항목 */
export type StrumPatternManifest = {
  id: string;
  categoryId: StrumCategoryId;
  /** 영문 제목 'Slow Rock Ex-1' (접근성 라벨 등) */
  title: string;
  /** 한글 제목 '슬로우 락 Ex01' (화면 표시) */
  titleKo: string;
  exerciseNo: number;
  displayNo: string;
  originalFileName: string;
  imageSrc: string;
  /** 카드용 WebP 썸네일 (생성 실패 시 원본) */
  thumbSrc: string;
  width: number;
  height: number;
  timeSignature: TimeSignature;
  countingFeel: CountingFeel;
  difficulty: Difficulty;
  /** manual = patterns.overrides.json 수동 태그, auto = 리듬 복잡도 자동 추정 */
  difficultySource: 'manual' | 'auto';
  recommendedBpm: BpmRange;
  tags: string[];
  /** 학생에게 보여줄 메모 (patterns.overrides.json) */
  notes?: string;
};

export type StrumPattern = StrumPatternManifest & {
  rhythm?: StrumRhythm;
};

export type SortMode = 'exercise' | 'recent' | 'favorites' | 'difficulty';

export type ViewMode = 'home' | 'category' | 'detail';

export type Instrument = 'guitar' | 'ukulele';
