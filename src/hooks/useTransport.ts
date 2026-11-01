import { useCallback, useEffect, useState } from 'react';
import { defaultEngineOptions, type EngineOptions, type EngineStatus } from '../audio/AudioEngine';
import { engine } from '../audio/engineInstance';
import type { Instrument, StrumPattern } from '../data/strumTypes';
import { useTransportSnapshot } from './useTransportClock';

export const BPM_MIN = 30;
export const BPM_MAX = 240;

export function clampBpm(bpm: number): number {
  return Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, bpm)));
}

export type Transport = {
  status: EngineStatus;
  /** 재생 또는 카운트인 중 */
  isRunning: boolean;
  bpm: number;
  options: EngineOptions;
  /** idle이면 처음부터, paused면 이어서 */
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
  setBpm: (bpm: number) => void;
  setOptions: (patch: Partial<EngineOptions>) => void;
};

const optionsKey = 'strum-viewer:transport-options';
const mixes = new Set(['both', 'strum', 'click']);
const instruments = new Set<Instrument>(['guitar', 'ukulele']);

/** 저장된 옵션을 검증하며 읽는다. 이상한 값은 기본값으로. */
function loadOptions(): EngineOptions {
  try {
    const raw = window.localStorage.getItem(optionsKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { ...defaultEngineOptions };
    const value = parsed as Record<string, unknown>;
    return {
      loop: typeof value.loop === 'boolean' ? value.loop : defaultEngineOptions.loop,
      countIn: typeof value.countIn === 'boolean' ? value.countIn : defaultEngineOptions.countIn,
      mix:
        typeof value.mix === 'string' && mixes.has(value.mix)
          ? (value.mix as EngineOptions['mix'])
          : defaultEngineOptions.mix,
      instrument:
        typeof value.instrument === 'string' && instruments.has(value.instrument as Instrument)
          ? (value.instrument as Instrument)
          : defaultEngineOptions.instrument,
      volume:
        typeof value.volume === 'number' && value.volume >= 0 && value.volume <= 1
          ? value.volume
          : defaultEngineOptions.volume,
    };
  } catch {
    return { ...defaultEngineOptions };
  }
}

function saveOptions(options: EngineOptions) {
  try {
    window.localStorage.setItem(optionsKey, JSON.stringify(options));
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)
  }
}

/**
 * 상세 화면의 재생 제어. 이 훅을 쓰는 컴포넌트는 `key={pattern.id}`로 마운트되어야 한다
 * (패턴이 바뀌면 상태가 새로 시작되고, 언마운트 시 재생이 정지된다).
 */
export function useTransport(pattern: StrumPattern): Transport {
  const snapshot = useTransportSnapshot();
  const [bpm, setBpmState] = useState(() => clampBpm(pattern.recommendedBpm.default));
  const [options, setOptionsState] = useState<EngineOptions>(loadOptions);

  // 마운트: 이 패턴을 엔진에 올린다. 언마운트(뒤로/다른 패턴): 정지.
  useEffect(() => {
    engine.load(pattern, bpm);
    engine.setOptions(options);
    return () => {
      if (engine.patternId === pattern.id) {
        engine.stop();
      }
    };
    // 마운트 시점 값만 쓴다. 이후 bpm·options 변경은 setter가 엔진에 직접 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern]);

  // 엔진이 다른 패턴(카드 미리듣기 등)을 재생 중이면 이 화면은 idle로 본다.
  const ownsEngine = engine.patternId === pattern.id;
  const status: EngineStatus = ownsEngine ? snapshot.status : 'idle';

  const ensureLoaded = useCallback(() => {
    if (engine.patternId !== pattern.id) {
      engine.load(pattern, bpm);
    }
    engine.setBpm(bpm);
  }, [bpm, pattern]);

  const play = useCallback(async () => {
    if (engine.patternId === pattern.id && engine.status === 'paused') {
      await engine.resume();
      return;
    }
    ensureLoaded();
    await engine.start(options);
  }, [ensureLoaded, options, pattern.id]);

  const pause = useCallback(() => engine.pause(), []);

  const stop = useCallback(() => {
    if (engine.patternId === pattern.id) {
      engine.stop();
    }
  }, [pattern.id]);

  const toggle = useCallback(async () => {
    if (status === 'playing' || status === 'counting-in') {
      await engine.pause();
    } else {
      await play();
    }
  }, [play, status]);

  const setBpm = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return;
      const clamped = clampBpm(next);
      setBpmState(clamped);
      if (engine.patternId === pattern.id) {
        engine.setBpm(clamped);
      }
    },
    [pattern.id],
  );

  const setOptions = useCallback((patch: Partial<EngineOptions>) => {
    setOptionsState((previous) => {
      const next = { ...previous, ...patch };
      saveOptions(next);
      return next;
    });
    engine.setOptions(patch);
  }, []);

  return {
    status,
    isRunning: status === 'playing' || status === 'counting-in',
    bpm,
    options,
    play,
    pause,
    stop,
    toggle,
    setBpm,
    setOptions,
  };
}
