import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine, clickOnlyRhythm, type EngineEvent } from './AudioEngine';
import {
  advance,
  createRecordingVoices,
  FakeAudioContext,
  makePattern,
  quarterDowns,
} from './__test__/fakeAudio';

function setup() {
  const context = new FakeAudioContext();
  const recorder = createRecordingVoices();
  const engine = new AudioEngine(() => context as unknown as AudioContext, recorder.voices);
  const events: EngineEvent[] = [];
  engine.subscribe((event) => events.push(event));
  engine.load(makePattern(quarterDowns), 60);
  return { context, engine, events, ...recorder };
}

const round = (value: number) => Number(value.toFixed(4));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AudioEngine — 예약', () => {
  it('노트 단위로 예약하고 시각이 타임라인과 일치한다', async () => {
    const { context, engine, strums, clicks } = setup();
    await engine.start({ mix: 'both', loop: true, countIn: false });
    expect(engine.status).toBe('playing');

    // 시작 직후엔 0.1초 앞(0.05)까지만 예약 — 루프 전체를 한꺼번에 예약하지 않는다.
    expect(strums().map((call) => round(call.time))).toEqual([0.05]);

    advance(context, 4.2);
    expect(strums().map((call) => round(call.time))).toEqual([0.05, 1.05, 2.05, 3.05, 4.05]);
    expect(clicks().map((call) => round(call.time))).toEqual([0.05, 1.05, 2.05, 3.05, 4.05]);
    expect(clicks().map((call) => call.kind === 'click' && call.accent)).toEqual([
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it('위치(progress·activeStrokeIndex)는 오디오 클럭에서 계산된다', async () => {
    const { context, engine } = setup();
    await engine.start({ countIn: false });
    advance(context, 1.55); // now=1.55, 루프 기준 1.5초
    const position = engine.getPosition();
    expect(position.cycle).toBe(0);
    expect(position.progress).toBeCloseTo(1.5 / 4, 3);
    expect(position.activeStrokeIndex).toBe(1);

    advance(context, 3); // now=4.55 → 둘째 사이클 0.5초
    expect(engine.getPosition().cycle).toBe(1);
    expect(engine.getPosition().activeStrokeIndex).toBe(0);
  });
});

describe('AudioEngine — 정지', () => {
  it('stop()은 예약 노드를 모두 끊고 페이드아웃하며 이후 아무것도 예약하지 않는다', async () => {
    const { context, engine, strums, events } = setup();
    await engine.start({ countIn: false });
    advance(context, 1.0);
    const scheduled = strums();
    expect(scheduled.length).toBeGreaterThan(0);

    const stopAt = context.currentTime;
    engine.stop();

    for (const call of scheduled) {
      expect(call.node.stop).toHaveBeenCalledWith(expect.closeTo(stopAt + 0.02, 3));
    }
    const runBus = context.gains[1];
    expect(runBus.gain.calls.at(-1)).toMatchObject({ method: 'ramp', value: 0 });
    expect(engine.status).toBe('idle');
    expect(events.at(-1)).toEqual({ type: 'status', status: 'idle' });

    const countBefore = strums().length;
    advance(context, 3);
    expect(strums()).toHaveLength(countBefore);
    expect(engine.getPosition()).toMatchObject({
      status: 'idle',
      progress: 0,
      activeStrokeIndex: -1,
    });
  });

  it('load()는 재생 중이면 정지한다', async () => {
    const { context, engine } = setup();
    await engine.start();
    advance(context, 0.5);
    engine.load(makePattern(quarterDowns, { id: 'other' }), 90);
    expect(engine.status).toBe('idle');
    expect(engine.bpm).toBe(90);
  });
});

describe('AudioEngine — 루프 OFF 종료', () => {
  it('한 바퀴 후 ended를 1회 내고 idle이 된다', async () => {
    const { context, engine, strums, events } = setup();
    await engine.start({ loop: false, countIn: false, mix: 'strum' });
    advance(context, 3.9);
    expect(engine.getPosition().progress).toBeGreaterThan(0.9);
    advance(context, 0.5);
    expect(engine.status).toBe('idle');
    expect(events.filter((event) => event.type === 'ended')).toHaveLength(1);
    expect(strums()).toHaveLength(4);
    advance(context, 4);
    expect(strums()).toHaveLength(4);
  });

  it('루프 OFF에서 끝나기 전에 다시 켜면 계속 돈다', async () => {
    const { context, engine, events } = setup();
    await engine.start({ loop: false, countIn: false });
    advance(context, 3.98);
    engine.setOptions({ loop: true });
    advance(context, 2);
    expect(engine.status).toBe('playing');
    expect(events.some((event) => event.type === 'ended')).toBe(false);
    expect(engine.getPosition().cycle).toBe(1);
  });
});

describe('AudioEngine — 재생 중 변경', () => {
  it('setBpm은 위상을 보존하고 중복 발음이 없다', async () => {
    const { context, engine, strums } = setup();
    await engine.start({ countIn: false, mix: 'strum' });
    advance(context, 1.55); // 진행도 0.375
    const before = engine.getPosition().progress;

    engine.setBpm(120); // 루프 2초
    const after = engine.getPosition().progress;
    expect(after).toBeCloseTo(before, 6);

    advance(context, 3);
    const times = strums().map((call) => round(call.time));
    expect(new Set(times).size).toBe(times.length);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    // 1.05(옛 템포) 다음 스트로크는 새 템포(0.5초 간격) 기준 위상 0.5 → now + 0.25
    expect(times[2]).toBeCloseTo(1.55 + 0.25, 3);
    expect(times[3]).toBeCloseTo(1.55 + 0.75, 3);
  });

  it('mix를 click으로 바꾸면 이후 스트럼 발음이 없다(하이라이트는 유지)', async () => {
    const { context, engine, strums, clicks } = setup();
    await engine.start({ countIn: false, mix: 'both' });
    advance(context, 0.5);
    engine.setOptions({ mix: 'click' });
    const strumCount = strums().length;
    advance(context, 3);
    expect(strums()).toHaveLength(strumCount);
    expect(clicks().length).toBeGreaterThan(3);
    expect(engine.getPosition().activeStrokeIndex).toBeGreaterThanOrEqual(0);
  });

  it('instrument 변경은 다음 예약부터 반영', async () => {
    const { context, engine, strums } = setup();
    await engine.start({ countIn: false, instrument: 'guitar', mix: 'strum' });
    advance(context, 0.5);
    engine.setOptions({ instrument: 'ukulele' });
    advance(context, 1);
    expect(strums().map((call) => call.kind === 'strum' && call.instrument)).toEqual([
      'guitar',
      'ukulele',
    ]);
  });
});

describe('AudioEngine — 일시정지', () => {
  it('pause는 클럭을 멈추고 resume은 같은 위치에서 이어간다', async () => {
    const { context, engine, strums } = setup();
    await engine.start({ countIn: false, mix: 'strum' });
    advance(context, 1.5);
    const before = engine.getPosition().progress;

    await engine.pause();
    expect(engine.status).toBe('paused');
    expect(context.suspend).toHaveBeenCalled();
    const countBefore = strums().length;
    advance(context, 5); // 벽시계만 흐름
    expect(strums()).toHaveLength(countBefore);
    expect(engine.getPosition().progress).toBeCloseTo(before, 6);

    await engine.resume();
    expect(engine.status).toBe('playing');
    advance(context, 1);
    expect(strums().length).toBeGreaterThan(countBefore);
  });

  it('일시정지 중 stop()은 클럭을 다시 돌려 페이드가 실행되게 한다', async () => {
    const { context, engine } = setup();
    await engine.start({ countIn: false });
    advance(context, 1);
    await engine.pause();
    engine.stop();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(engine.status).toBe('idle');
  });
});

describe('AudioEngine — 카운트인', () => {
  it('한 마디 클릭 후 첫 박이 시작되고 위치에 카운트가 나온다', async () => {
    const { context, engine, strums, clicks } = setup();
    await engine.start({ countIn: true, mix: 'strum' });
    expect(engine.status).toBe('counting-in');
    expect(clicks().map((call) => round(call.time))).toEqual([0.05, 1.05, 2.05, 3.05]);

    advance(context, 1.1);
    expect(engine.getPosition().countIn).toEqual({ beat: 2, beats: 4 });
    expect(strums()).toHaveLength(0);

    advance(context, 3.1);
    expect(engine.status).toBe('playing');
    expect(strums()[0].time).toBeCloseTo(4.05, 6);
    expect(engine.getPosition().countIn).toBeNull();
  });
});

describe('AudioEngine — 기타', () => {
  it('늦게 처리된 이벤트는 몰아서 울리지 않는다', async () => {
    const { context, engine, strums } = setup();
    await engine.start({ countIn: false, mix: 'strum' });
    context.currentTime = 2.5; // 탭이 백그라운드에서 멈췄다 돌아온 상황
    vi.advanceTimersByTime(25);
    expect(strums().map((call) => round(call.time))).toEqual([0.05]);
  });

  it('리듬 없는 패턴은 박자표로 클릭 전용 리듬을 만든다', () => {
    expect(clickOnlyRhythm('6/8')).toMatchObject({ beatsPerBar: 2, subdivision: 6, strokes: [] });
    expect(clickOnlyRhythm('3/4')).toMatchObject({ beatsPerBar: 3 });
    const { engine } = setup();
    engine.load(makePattern(undefined, { timeSignature: '12/8' }), 60);
    expect(engine.rhythm).toMatchObject({ beatsPerBar: 4, subdivision: 3 });
  });

  it('비정상 BPM은 무시하거나 범위로 자른다', () => {
    const { engine } = setup();
    engine.setBpm(Number.NaN);
    expect(engine.bpm).toBe(60);
    engine.setBpm(0);
    expect(engine.bpm).toBe(60);
    engine.setBpm(1000);
    expect(engine.bpm).toBe(300);
  });

  it('start 전에 load가 없으면 오류', async () => {
    const engine = new AudioEngine(
      () => new FakeAudioContext() as unknown as AudioContext,
      createRecordingVoices().voices,
    );
    await expect(engine.start()).rejects.toThrow();
  });
});
