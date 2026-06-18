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

export type StrumFeel =
  | 'straight'
  | 'sixteenth'
  | 'triplet'
  | 'shuffle'
  | 'slow'
  | 'latin'
  | 'country';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type BpmRange = {
  min: number;
  max: number;
  default: number;
};

export type StrumCategory = {
  id: StrumCategoryId;
  labelKo: string;
  labelEn: string;
  shortLabel: string;
  description: string;
  timeSignature: TimeSignature;
  feel: StrumFeel;
  color: string;
  accentColor: string;
  patternCount: number;
  recommendedBpm: BpmRange;
  tags: string[];
};

export type StrokeDir = 'down' | 'up' | 'rest' | 'mute';

export type Stroke = {
  step: number;
  dir: StrokeDir;
  accent?: boolean;
  tie?: boolean;
  durationSteps?: number;
  xNorm?: number;
};

export type StrumRhythm = {
  timeSignature: [number, number];
  pulseNote: 'quarter' | 'dotted-quarter';
  beatsPerBar: number;
  subdivision: number;
  bars: number;
  feelTiming: 'straight' | 'swing' | 'triplet' | 'compound';
  swing?: number;
  strokes: Stroke[];
  imageLeftPad?: number;
  imageRightPad?: number;
};

export type StrumPattern = {
  id: string;
  categoryId: StrumCategoryId;
  title: string;
  exerciseNo: number;
  displayNo: string;
  originalFileName: string;
  imageSrc: string;
  width: number;
  height: number;
  timeSignature: TimeSignature;
  feel: StrumFeel;
  difficulty: Difficulty;
  recommendedBpm: BpmRange;
  tags: string[];
  notes?: string;
  rhythm?: StrumRhythm;
};

export type SortMode = 'exercise' | 'recent' | 'favorites' | 'difficulty';

export type ViewMode = 'home' | 'category' | 'detail';

export type Instrument = 'guitar' | 'ukulele';
