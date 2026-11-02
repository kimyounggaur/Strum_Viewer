import type {
  Instrument,
  Stroke,
  StrumPattern,
  StrumRhythm,
  TimeSignature,
} from '../data/strumTypes';
import { getAudioContext } from './audioContext';
import {
  activeStrokeAt,
  buildTimeline,
  type Mix,
  type Timeline,
  type TimelineEvent,
} from './timeline';
import { playMetronomeClick, playStrum } from './voices/synth';

/**
 * 스트럼 재생 엔진 (앱 전체 1개).
 *
 * 시간 모델: 모든 시각은 AudioContext.currentTime(초). 루프 1바퀴를 "사이클"이라 부른다.
 *   cycleStart(k) = anchor.time + (k - anchor.cycle) * loopDuration
 * 스케줄러와 UI 위치 계산이 같은 anchor를 읽으므로 둘은 어긋나지 않는다.
 *
 * - 노트 단위 룩어헤드: 25ms마다 앞으로 0.1초 안의 이벤트만 예약한다.
 * - 정지: 실행(run)마다 별도 GainNode를 두고 15ms 페이드 후 예약 노드를 모두 stop.
 * - 일시정지: context.suspend()로 오디오 클럭 자체를 멈춘다(위치·예약이 그대로 보존).
 * - BPM 변경: 현재 위상(progress)을 보존하도록 anchor를 옮기고, 이미 예약한 시각 이후부터 다시 예약.
 */

export type EngineStatus = 'idle' | 'counting-in' | 'playing' | 'paused';

export type EngineOptions = {
  loop: boolean;
  countIn: boolean;
  mix: Mix;
  instrument: Instrument;
  /** 0..1 마스터 볼륨 */
  volume: number;
};

export type EngineEvent =
  | { type: 'status'; status: EngineStatus }
  /** 새 사이클의 이벤트를 예약하기 시작할 때 (템포 트레이너 등) */
  | { type: 'cycle'; cycle: number; startTime: number }
  /** loop=false 재생이 끝까지 가서 자연 종료 */
  | { type: 'ended' };

export type EnginePosition = {
  status: EngineStatus;
  cycle: number;
  /** 0..1 루프 진행도 */
  progress: number;
  /** rhythm.strokes 원본 인덱스. -1 = 없음 */
  activeStrokeIndex: number;
  /** 카운트인 중일 때 1-based 현재 박 */
  countIn: { beat: number; beats: number } | null;
  loopDuration: number;
};

export type Voices = {
  strum: (
    context: BaseAudioContext,
    time: number,
    stroke: Stroke,
    instrument: Instrument,
    destination: AudioNode,
  ) => AudioScheduledSourceNode[];
  click: (
    context: BaseAudioContext,
    time: number,
    accent: boolean,
    destination: AudioNode,
  ) => AudioScheduledSourceNode[];
};

const synthVoices: Voices = { strum: playStrum, click: playMetronomeClick };

export const defaultEngineOptions: EngineOptions = {
  loop: true,
  countIn: false,
  mix: 'both',
  instrument: 'guitar',
  volume: 0.9,
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.1;
const START_DELAY = 0.05;
const FADE_OUT = 0.015;
/** 이보다 늦게 처리된 이벤트는 몰아서 울리지 않고 건너뛴다(탭 백그라운드 복귀 등). */
const LATE_TOLERANCE = 0.05;

/** 리듬 데이터가 없는 패턴용: 박자표만으로 클릭 전용 리듬을 만든다. */
export function clickOnlyRhythm(timeSignature: TimeSignature): StrumRhythm {
  const base = { bars: 1, strokes: [] as Stroke[] };
  switch (timeSignature) {
    case '3/4':
      return {
        ...base,
        timeSignature: [3, 4],
        pulseNote: 'quarter',
        beatsPerBar: 3,
        subdivision: 2,
        feelTiming: 'straight',
      };
    case '6/8':
      return {
        ...base,
        timeSignature: [6, 8],
        pulseNote: 'dotted-quarter',
        beatsPerBar: 2,
        subdivision: 6,
        feelTiming: 'compound',
      };
    case '12/8':
      return {
        ...base,
        timeSignature: [12, 8],
        pulseNote: 'dotted-quarter',
        beatsPerBar: 4,
        subdivision: 3,
        feelTiming: 'compound',
      };
    default:
      return {
        ...base,
        timeSignature: [4, 4],
        pulseNote: 'quarter',
        beatsPerBar: 4,
        subdivision: 2,
        feelTiming: 'straight',
      };
  }
}

export class AudioEngine {
  private readonly getContext: () => AudioContext;
  private readonly voices: Voices;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private runBus: GainNode | null = null;

  private rhythmValue: StrumRhythm | null = null;
  private patternIdValue: string | null = null;
  private bpmValue = 80;
  private optionsValue: EngineOptions = { ...defaultEngineOptions };
  private timeline: Timeline | null = null;
  private statusValue: EngineStatus = 'idle';

  private anchor = { time: 0, cycle: 0 };
  private countInStart = 0;
  private countInBeats = 0;
  private schedCycle = 0;
  private nextEventIndex = 0;
  private scheduledUntil = Number.NEGATIVE_INFINITY;

  private timerId: ReturnType<typeof setInterval> | null = null;
  private endTimerId: ReturnType<typeof setTimeout> | null = null;
  private suspendedByEngine = false;
  /** start/stop/pause가 await 중에 겹칠 때 오래된 호출을 무효화한다. */
  private runId = 0;

  private readonly activeNodes = new Set<AudioScheduledSourceNode>();
  private readonly listeners = new Set<(event: EngineEvent) => void>();

  constructor(getContext: () => AudioContext = getAudioContext, voices: Voices = synthVoices) {
    this.getContext = getContext;
    this.voices = voices;
  }

  // ───────────────────────── 조회 ─────────────────────────

  get status(): EngineStatus {
    return this.statusValue;
  }

  get bpm(): number {
    return this.bpmValue;
  }

  get options(): EngineOptions {
    return this.optionsValue;
  }

  get rhythm(): StrumRhythm | null {
    return this.rhythmValue;
  }

  /** 마지막으로 load()한 패턴 id */
  get patternId(): string | null {
    return this.patternIdValue;
  }

  get isActive(): boolean {
    return this.statusValue !== 'idle';
  }

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 순수 계산(부작용 없음). rAF에서 매 프레임 호출해도 된다. */
  getPosition(): EnginePosition {
    const timeline = this.timeline;
    const loopDuration = timeline?.loopDuration ?? 0;
    const idle: EnginePosition = {
      status: this.statusValue,
      cycle: 0,
      progress: 0,
      activeStrokeIndex: -1,
      countIn: null,
      loopDuration,
    };
    if (this.statusValue === 'idle' || !this.context || !timeline || loopDuration <= 0) {
      return idle;
    }

    const now = this.context.currentTime;
    if (now < this.anchor.time) {
      const countIn =
        this.countInBeats > 0
          ? {
              beat: Math.min(
                this.countInBeats,
                Math.max(1, Math.floor((now - this.countInStart) / timeline.secPerBeat) + 1),
              ),
              beats: this.countInBeats,
            }
          : null;
      return { ...idle, cycle: this.anchor.cycle, countIn };
    }

    const elapsed = now - this.anchor.time;
    const wraps = Math.floor(elapsed / loopDuration);
    let cycle = this.anchor.cycle + wraps;
    let offset = elapsed - wraps * loopDuration;
    // loop=false 마지막 사이클이 끝난 뒤 ended가 오기 전까지는 끝에 멈춰 있는다.
    if (!this.optionsValue.loop && cycle > this.schedCycle) {
      cycle = this.schedCycle;
      offset = loopDuration;
    }

    return {
      status: this.statusValue,
      cycle,
      progress: Math.min(1, offset / loopDuration),
      activeStrokeIndex: activeStrokeAt(timeline, offset),
      countIn: null,
      loopDuration,
    };
  }

  // ───────────────────────── 제어 ─────────────────────────

  /** 패턴을 바꾼다. 재생 중이면 정지한다. 리듬이 없으면 박자표 기반 클릭 전용 리듬을 쓴다. */
  load(pattern: StrumPattern, bpm: number): void {
    this.stop();
    this.rhythmValue = pattern.rhythm ?? clickOnlyRhythm(pattern.timeSignature);
    this.patternIdValue = pattern.id;
    this.bpmValue = sanitizeBpm(bpm, this.bpmValue);
    this.rebuild();
  }

  /** 사용자 제스처 핸들러 안에서 호출한다. */
  async start(options: Partial<EngineOptions> = {}): Promise<void> {
    const rhythm = this.rhythmValue;
    if (!rhythm) {
      throw new Error('AudioEngine.start: load()로 패턴을 먼저 불러와야 합니다.');
    }

    this.stop();
    this.optionsValue = { ...this.optionsValue, ...options };
    const run = this.runId;

    const context = this.ensureContext();
    if (context.state !== 'running') {
      await context.resume();
    }
    if (run !== this.runId) return; // await 중에 stop/start가 다시 불렸다.

    const master = this.ensureMaster(context);
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(this.optionsValue.volume, context.currentTime);

    const bus = context.createGain();
    bus.connect(master);
    this.runBus = bus;

    this.rebuild();
    const timeline = this.timeline!;
    const t0 = context.currentTime + START_DELAY;

    if (this.optionsValue.countIn) {
      const beats = rhythm.beatsPerBar; // 2마디 패턴도 카운트는 1마디
      for (let beat = 0; beat < beats; beat += 1) {
        this.track(this.voices.click(context, t0 + beat * timeline.secPerBeat, beat === 0, bus));
      }
      this.countInStart = t0;
      this.countInBeats = beats;
      this.anchor = { time: t0 + beats * timeline.secPerBeat, cycle: 0 };
      this.setStatus('counting-in');
    } else {
      this.countInBeats = 0;
      this.anchor = { time: t0, cycle: 0 };
      this.setStatus('playing');
    }

    this.schedCycle = 0;
    this.nextEventIndex = 0;
    this.scheduledUntil = Number.NEGATIVE_INFINITY;
    this.emit({ type: 'cycle', cycle: 0, startTime: this.anchor.time });
    this.startTimer();
    this.tick();
  }

  /** 20ms 안에 무음으로 만든다. 상태는 즉시 idle. */
  stop(): void {
    this.runId += 1;
    this.clearTimers();

    const context = this.context;
    const bus = this.runBus;
    if (context) {
      const now = context.currentTime;
      if (bus) {
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + FADE_OUT);
        setTimeout(() => bus.disconnect(), 200);
      }
      for (const node of this.activeNodes) {
        try {
          node.stop(now + FADE_OUT + 0.005);
        } catch {
          // 이미 끝난 노드
        }
      }
      if (this.suspendedByEngine) {
        // 일시정지 중에 정지하면 페이드·stop이 실행되도록 클럭을 다시 돌린다.
        this.suspendedByEngine = false;
        void context.resume();
      }
    }
    this.activeNodes.clear();
    this.runBus = null;
    this.resetPointers();
    this.setStatus('idle');
  }

  async pause(): Promise<void> {
    if (this.statusValue !== 'playing' && this.statusValue !== 'counting-in') return;
    const context = this.context;
    if (!context) return;
    const run = this.runId;
    this.clearTimers();
    this.suspendedByEngine = true;
    this.setStatus('paused');
    await context.suspend();
    // await 동안 stop/start로 상태가 바뀌었을 수 있다(TS 좁히기는 await를 넘지 못함).
    const statusNow = this.statusValue as EngineStatus;
    if (run !== this.runId && statusNow !== 'paused' && context.state === 'suspended') {
      // suspend 대기 중에 stop/start가 불렸는데 클럭이 멈춘 채로 남은 경우 다시 돌린다.
      await context.resume();
    }
  }

  async resume(): Promise<void> {
    if (this.statusValue !== 'paused') return;
    const context = this.context;
    if (!context) return;
    const run = this.runId;
    await context.resume();
    this.suspendedByEngine = false;
    if (run !== this.runId || this.statusValue !== 'paused') return;
    this.setStatus(context.currentTime < this.anchor.time ? 'counting-in' : 'playing');
    this.startTimer();
    this.tick();
  }

  setBpm(bpm: number): void {
    const next = sanitizeBpm(bpm, this.bpmValue);
    if (next === this.bpmValue) return;
    this.bpmValue = next;
    this.rebuild();
  }

  setOptions(patch: Partial<EngineOptions>): void {
    const previous = this.optionsValue;
    this.optionsValue = { ...previous, ...patch };

    if (patch.volume !== undefined && this.master && this.context) {
      this.master.gain.setTargetAtTime(
        Math.min(1, Math.max(0, patch.volume)),
        this.context.currentTime,
        0.01,
      );
    }
    if (patch.mix !== undefined && patch.mix !== previous.mix) {
      this.rebuild();
    }
    if (patch.loop === true && this.endTimerId !== null) {
      // 끝내려던 재생을 다시 루프로 — 종료 예약만 취소하면 스케줄러가 다음 사이클로 넘어간다.
      clearTimeout(this.endTimerId);
      this.endTimerId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  // ───────────────────────── 내부 ─────────────────────────

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = this.getContext();
    }
    return this.context;
  }

  private ensureMaster(context: AudioContext): GainNode {
    if (!this.master) {
      this.master = context.createGain();
      this.master.connect(context.destination);
    }
    return this.master;
  }

  private cycleStart(cycle: number): number {
    return this.anchor.time + (cycle - this.anchor.cycle) * (this.timeline?.loopDuration ?? 0);
  }

  /**
   * 타임라인을 다시 만든다. 재생 중이면 위상을 보존하고, 이미 예약한 시각 이후의
   * 첫 이벤트부터 이어서 예약한다(중복 발음 없음).
   */
  private rebuild(): void {
    const rhythm = this.rhythmValue;
    if (!rhythm) return;
    const next = buildTimeline(rhythm, this.bpmValue, this.optionsValue.mix);
    const context = this.context;

    if (!context || this.statusValue === 'idle' || !this.timeline) {
      this.timeline = next;
      return;
    }

    const now = context.currentTime;
    if (now >= this.anchor.time) {
      // 재생 중(또는 일시정지 중): 현재 위상을 새 루프 길이에 맞춰 보존
      const position = this.getPosition();
      this.anchor = {
        time: now - position.progress * next.loopDuration,
        cycle: position.cycle,
      };
    }
    // 카운트인 중이면 anchor(첫 박 시각)는 그대로 둔다.
    this.timeline = next;

    if (this.endTimerId !== null) {
      clearTimeout(this.endTimerId);
      this.endTimerId = null;
    }

    const startCycle = Math.max(
      this.anchor.cycle,
      Math.min(this.schedCycle, this.anchor.cycle + 1),
    );
    // loop=false면 현재 사이클 밖으로 넘어가지 않는다(남은 이벤트가 없으면 끝 처리).
    const lastCycle = this.optionsValue.loop ? startCycle + 3 : startCycle;
    for (let cycle = startCycle; cycle <= lastCycle; cycle += 1) {
      const base = this.cycleStart(cycle);
      const index = next.events.findIndex(
        (event) => base + event.offset > this.scheduledUntil + 1e-6,
      );
      if (index >= 0) {
        if (cycle !== this.schedCycle) {
          this.emit({ type: 'cycle', cycle, startTime: base });
        }
        this.schedCycle = cycle;
        this.nextEventIndex = index;
        return;
      }
    }
    this.schedCycle = startCycle;
    this.nextEventIndex = next.events.length;
  }

  private tick = (): void => {
    const context = this.context;
    const timeline = this.timeline;
    if (!context || !timeline) return;

    const now = context.currentTime;
    if (this.statusValue === 'counting-in' && now >= this.anchor.time) {
      this.setStatus('playing');
    }

    const horizon = now + SCHEDULE_AHEAD;
    for (;;) {
      if (this.nextEventIndex >= timeline.events.length) {
        if (!this.optionsValue.loop) {
          if (this.endTimerId === null) {
            this.scheduleEnd(this.cycleStart(this.schedCycle) + timeline.loopDuration);
          }
          return;
        }
        this.schedCycle += 1;
        this.nextEventIndex = 0;
        this.emit({
          type: 'cycle',
          cycle: this.schedCycle,
          startTime: this.cycleStart(this.schedCycle),
        });
      }

      const event = timeline.events[this.nextEventIndex];
      const time = this.cycleStart(this.schedCycle) + event.offset;
      if (time >= horizon) return;

      if (time >= now - LATE_TOLERANCE) {
        this.play(event, Math.max(time, now));
      }
      this.scheduledUntil = time;
      this.nextEventIndex += 1;
    }
  };

  private play(event: TimelineEvent, time: number): void {
    const context = this.context;
    const bus = this.runBus;
    if (!context || !bus) return;

    if (event.kind === 'click') {
      this.track(this.voices.click(context, time, event.accent, bus));
    } else if (event.kind === 'stroke') {
      this.track(this.voices.strum(context, time, event.stroke, this.optionsValue.instrument, bus));
    }
  }

  private track(nodes: AudioScheduledSourceNode[]): void {
    for (const node of nodes) {
      this.activeNodes.add(node);
      node.onended = () => {
        this.activeNodes.delete(node);
      };
    }
  }

  private scheduleEnd(endTime: number): void {
    const context = this.context;
    if (!context) return;
    const delayMs = Math.max(0, (endTime - context.currentTime) * 1000) + 30;
    this.endTimerId = setTimeout(() => {
      this.endTimerId = null;
      this.finishNaturally();
    }, delayMs);
  }

  /** loop=false 재생이 끝났을 때: 남은 소리는 자연 감쇠시키고 상태만 정리한다. */
  private finishNaturally(): void {
    this.runId += 1;
    this.clearTimers();
    this.activeNodes.clear();
    this.runBus = null;
    this.resetPointers();
    this.setStatus('idle');
    this.emit({ type: 'ended' });
  }

  private startTimer(): void {
    if (this.timerId === null) {
      this.timerId = setInterval(this.tick, LOOKAHEAD_MS);
    }
  }

  private clearTimers(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.endTimerId !== null) {
      clearTimeout(this.endTimerId);
      this.endTimerId = null;
    }
  }

  private resetPointers(): void {
    this.anchor = { time: 0, cycle: 0 };
    this.countInBeats = 0;
    this.schedCycle = 0;
    this.nextEventIndex = 0;
    this.scheduledUntil = Number.NEGATIVE_INFINITY;
  }

  private setStatus(status: EngineStatus): void {
    if (this.statusValue === status) return;
    this.statusValue = status;
    this.emit({ type: 'status', status });
  }

  private emit(event: EngineEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}

function sanitizeBpm(bpm: number, fallback: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return fallback;
  return Math.min(300, Math.max(20, bpm));
}
