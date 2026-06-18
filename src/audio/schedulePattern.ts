import type { StrumPattern, Stroke } from '../data/strumTypes';
import { strokeTimeInBar } from '../lib/rhythm';

export type ScheduledStroke = {
  timeInBar: number;
  stroke: Stroke;
  index: number;
};

export function schedulePattern(pattern: StrumPattern, bpm: number): ScheduledStroke[] {
  if (!pattern.rhythm) return [];

  return pattern.rhythm.strokes
    .map((stroke, index) => ({
      timeInBar: strokeTimeInBar(stroke, pattern.rhythm!, bpm),
      stroke,
      index,
    }))
    .sort((a, b) => a.timeInBar - b.timeInBar);
}
