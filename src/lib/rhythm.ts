import type { StrumRhythm, Stroke } from '../data/strumTypes';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function secPerBeat(bpm: number): number {
  return 60 / bpm;
}

export function stepDuration(rhythm: StrumRhythm, bpm: number): number {
  return secPerBeat(bpm) / rhythm.subdivision;
}

export function barDuration(rhythm: StrumRhythm, bpm: number): number {
  return rhythm.beatsPerBar * secPerBeat(bpm);
}

/** Number of bars the pattern spans (defaults to 1 for legacy single-bar rhythms). */
export function barCount(rhythm: StrumRhythm): number {
  return Math.max(1, Math.round(rhythm.bars ?? 1));
}

/** Total beats in one full loop of the pattern (all bars). */
export function loopBeats(rhythm: StrumRhythm): number {
  return rhythm.beatsPerBar * barCount(rhythm);
}

/** Duration of one full loop of the pattern (all bars) in seconds. */
export function loopDuration(rhythm: StrumRhythm, bpm: number): number {
  return loopBeats(rhythm) * secPerBeat(bpm);
}

/** Grid cells across the entire loop (all bars). */
export function cellsInLoop(rhythm: StrumRhythm): number {
  return loopBeats(rhythm) * rhythm.subdivision;
}

export function stepToTime(step: number, rhythm: StrumRhythm, bpm: number): number {
  const beatDuration = secPerBeat(bpm);
  const beatIndex = Math.floor(step / rhythm.subdivision);
  const withinBeat = step % rhythm.subdivision;

  if (rhythm.feelTiming === 'swing' && rhythm.subdivision === 2) {
    if (withinBeat === 0) {
      return beatIndex * beatDuration;
    }

    return beatIndex * beatDuration + beatDuration * clamp(rhythm.swing ?? 0.65, 0.5, 0.75);
  }

  return beatIndex * beatDuration + (withinBeat / rhythm.subdivision) * beatDuration;
}

export function strokeTimeInBar(stroke: Stroke, rhythm: StrumRhythm, bpm: number): number {
  return stepToTime(stroke.step, rhythm, bpm);
}

export function cellsInBar(rhythm: StrumRhythm): number {
  return rhythm.beatsPerBar * rhythm.subdivision;
}

export function progressToStep(progress: number, rhythm: StrumRhythm): number {
  return Math.min(cellsInLoop(rhythm) - 1, Math.floor(clamp(progress, 0, 0.9999) * cellsInLoop(rhythm)));
}

export function strokeXNorm(stroke: Stroke, rhythm: StrumRhythm): number {
  if (typeof stroke.xNorm === 'number') {
    return clamp(stroke.xNorm, 0, 1);
  }

  const left = rhythm.imageLeftPad ?? 0.12;
  const right = rhythm.imageRightPad ?? 0.92;
  const cells = Math.max(1, cellsInLoop(rhythm) - 1);
  return left + (right - left) * (stroke.step / cells);
}

export function formatBeatLabels(rhythm: StrumRhythm): string[] {
  const labels: string[] = [];
  const tripletLabels = ['1', '&', 'a'];
  const sixteenthLabels = ['1', 'e', '&', 'a'];
  const eighthLabels = ['1', '&'];

  for (let beat = 0; beat < loopBeats(rhythm); beat += 1) {
    const base = String((beat % rhythm.beatsPerBar) + 1);
    const source =
      rhythm.subdivision === 4 ? sixteenthLabels : rhythm.subdivision === 3 ? tripletLabels : eighthLabels;

    for (let sub = 0; sub < rhythm.subdivision; sub += 1) {
      labels.push(sub === 0 ? base : source[sub] ?? String(sub + 1));
    }
  }

  return labels;
}

export function runRhythmMathSmokeTest(): boolean {
  const rhythm: StrumRhythm = {
    timeSignature: [6, 8],
    pulseNote: 'dotted-quarter',
    beatsPerBar: 2,
    subdivision: 3,
    bars: 1,
    feelTiming: 'compound',
    strokes: [],
  };

  const sixEightBar = barDuration(rhythm, 76);
  return Math.abs(sixEightBar - 1.5789) < 0.01;
}
