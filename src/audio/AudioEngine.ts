import type { Instrument, StrumPattern } from '../data/strumTypes';
import { barDuration, secPerBeat } from '../lib/rhythm';
import { schedulePattern, type ScheduledStroke } from './schedulePattern';
import { playMetronomeClick, playStrum } from './strumVoices';

type StartOptions = {
  loop: boolean;
  countIn: boolean;
  metronome: boolean;
  onBarStart?: (barIndex: number, barStartTime: number) => void;
};

export class AudioEngine {
  private contextValue: AudioContext | null = null;
  private pattern: StrumPattern | null = null;
  private bpm = 80;
  private instrument: Instrument = 'guitar';
  private timerId: number | null = null;
  private timeoutIds: number[] = [];
  private nextBarStartTime = 0;
  private nextNoteTime = 0;
  private barIndex = 0;
  private events: ScheduledStroke[] = [];
  private loop = true;
  private metronome = true;
  private onBarStart?: (barIndex: number, barStartTime: number) => void;
  private readonly lookahead = 25;
  private readonly scheduleAheadTime = 0.14;

  currentBarStartTime = 0;

  get context(): AudioContext | null {
    return this.contextValue;
  }

  get loadedPattern(): StrumPattern | null {
    return this.pattern;
  }

  load(pattern: StrumPattern, bpm: number, instrument: Instrument) {
    this.pattern = pattern;
    this.bpm = bpm;
    this.instrument = instrument;
    this.events = schedulePattern(pattern, bpm);
  }

  async start(options: StartOptions): Promise<AudioContext> {
    if (!this.pattern?.rhythm) {
      throw new Error('Cannot start transport without rhythm data.');
    }

    this.stop();
    this.loop = options.loop;
    this.metronome = options.metronome;
    this.onBarStart = options.onBarStart;

    const context = this.contextValue ?? new AudioContext();
    this.contextValue = context;
    await context.resume();

    const rhythm = this.pattern.rhythm;
    const countInBeats = options.countIn ? rhythm.beatsPerBar : 0;
    const startOffset = countInBeats * secPerBeat(this.bpm) + 0.05;
    const startAt = context.currentTime + startOffset;

    this.currentBarStartTime = startAt;
    this.nextBarStartTime = startAt;
    this.nextNoteTime = startAt;
    this.barIndex = 0;

    if (options.countIn) {
      for (let beat = 0; beat < countInBeats; beat += 1) {
        playMetronomeClick(context, context.currentTime + 0.05 + beat * secPerBeat(this.bpm), beat === 0);
      }
    }

    this.timerId = window.setInterval(() => this.scheduler(), this.lookahead);
    this.scheduler();

    return context;
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.timeoutIds.forEach((id) => window.clearTimeout(id));
    this.timeoutIds = [];
    this.nextBarStartTime = 0;
    this.nextNoteTime = 0;
    this.barIndex = 0;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    if (this.pattern) {
      this.events = schedulePattern(this.pattern, bpm);
    }
  }

  setInstrument(instrument: Instrument) {
    this.instrument = instrument;
  }

  dispose() {
    this.stop();
    void this.contextValue?.close();
    this.contextValue = null;
  }

  private scheduler() {
    const context = this.contextValue;
    const pattern = this.pattern;
    const rhythm = pattern?.rhythm;
    if (!context || !pattern || !rhythm) return;

    while (this.nextNoteTime < context.currentTime + this.scheduleAheadTime) {
      if (!this.loop && this.barIndex >= rhythm.bars) {
        return;
      }

      this.scheduleBar(this.nextBarStartTime, this.barIndex);
      const duration = barDuration(rhythm, this.bpm);
      this.nextBarStartTime += duration;
      this.nextNoteTime = this.nextBarStartTime;
      this.barIndex += 1;

      if (!this.loop && this.barIndex >= rhythm.bars) {
        const stopId = window.setTimeout(
          () => this.stop(),
          Math.max(0, (this.nextBarStartTime - context.currentTime + 0.05) * 1000),
        );
        this.timeoutIds.push(stopId);
        break;
      }
    }
  }

  private scheduleBar(barStartTime: number, barIndex: number) {
    const context = this.contextValue;
    const pattern = this.pattern;
    const rhythm = pattern?.rhythm;
    if (!context || !pattern || !rhythm) return;

    const activate = () => {
      this.currentBarStartTime = barStartTime;
      this.onBarStart?.(barIndex, barStartTime);
    };

    if (barStartTime <= context.currentTime + 0.01) {
      activate();
    } else {
      const id = window.setTimeout(activate, Math.max(0, (barStartTime - context.currentTime) * 1000));
      this.timeoutIds.push(id);
    }

    for (const event of this.events) {
      playStrum(context, barStartTime + event.timeInBar, event.stroke, this.instrument);
    }

    if (this.metronome) {
      for (let beat = 0; beat < rhythm.beatsPerBar; beat += 1) {
        playMetronomeClick(context, barStartTime + beat * secPerBeat(this.bpm), beat === 0);
      }
    }
  }
}

export async function demoStrumEngine(pattern: StrumPattern): Promise<AudioEngine> {
  const engine = new AudioEngine();
  engine.load(pattern, pattern.recommendedBpm.default, 'guitar');
  await engine.start({ loop: true, countIn: true, metronome: true });
  return engine;
}
