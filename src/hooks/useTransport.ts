import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import { schedulePattern } from '../audio/schedulePattern';
import type { Instrument, StrumPattern } from '../data/strumTypes';
import { loopDuration } from '../lib/rhythm';

type TransportState = {
  isPlaying: boolean;
  bpm: number;
  loop: boolean;
  countIn: boolean;
  metronome: boolean;
  instrument: Instrument;
  progress: number;
  activeStrokeIndex: number;
  engine: AudioEngine;
  setBpm: (bpm: number) => void;
  setLoop: (loop: boolean) => void;
  setCountIn: (countIn: boolean) => void;
  setMetronome: (metronome: boolean) => void;
  setInstrument: (instrument: Instrument) => void;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
};

export function useTransport(pattern: StrumPattern): TransportState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(pattern.recommendedBpm.default);
  const [loop, setLoop] = useState(true);
  const [countIn, setCountIn] = useState(false);
  const [metronome, setMetronome] = useState(true);
  const [instrument, setInstrumentState] = useState<Instrument>('guitar');
  const [progress, setProgress] = useState(0);
  const [activeStrokeIndex, setActiveStrokeIndex] = useState(-1);
  const engineRef = useRef<AudioEngine>(new AudioEngine());
  const animationRef = useRef<number | null>(null);
  const latestRef = useRef({ bpm, pattern, isPlaying });

  useEffect(() => {
    latestRef.current = { bpm, pattern, isPlaying };
  }, [bpm, isPlaying, pattern]);

  useEffect(() => {
    setBpmState(pattern.recommendedBpm.default);
    setProgress(0);
    setActiveStrokeIndex(-1);
  }, [pattern.id, pattern.recommendedBpm.default]);

  useEffect(() => {
    const engine = engineRef.current;
    engine.load(pattern, bpm, instrument);
    engine.setBpm(bpm);
    engine.setInstrument(instrument);
  }, [bpm, instrument, pattern]);

  const tick = useCallback(() => {
    const engine = engineRef.current;
    const currentPattern = latestRef.current.pattern;
    const context = engine.context;
    const rhythm = currentPattern.rhythm;

    if (context && rhythm && latestRef.current.isPlaying) {
      const duration = loopDuration(rhythm, latestRef.current.bpm);
      const rawProgress = duration > 0 ? (context.currentTime - engine.currentBarStartTime) / duration : 0;
      const nextProgress = Math.min(1, Math.max(0, rawProgress));
      setProgress(nextProgress);

      const elapsed = nextProgress * duration;
      const events = schedulePattern(currentPattern, latestRef.current.bpm);
      const active = events.reduce((last, event, index) => (event.timeInBar <= elapsed ? index : last), -1);
      setActiveStrokeIndex(active);
    }

    animationRef.current = window.requestAnimationFrame(tick);
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!pattern.rhythm) return;

    const engine = engineRef.current;
    engine.load(pattern, bpm, instrument);
    await engine.start({
      loop,
      countIn,
      metronome,
      onBarStart: () => {
        setProgress(0);
        setActiveStrokeIndex(-1);
      },
    });
    setIsPlaying(true);
    latestRef.current = { bpm, pattern, isPlaying: true };
    stopAnimation();
    animationRef.current = window.requestAnimationFrame(tick);
  }, [bpm, countIn, instrument, loop, metronome, pattern, stopAnimation, tick]);

  const stop = useCallback(() => {
    engineRef.current.stop();
    stopAnimation();
    setIsPlaying(false);
    setProgress(0);
    setActiveStrokeIndex(-1);
    latestRef.current = { bpm, pattern, isPlaying: false };
  }, [bpm, pattern, stopAnimation]);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      stop();
      return;
    }

    await start();
  }, [isPlaying, start, stop]);

  const setBpm = useCallback((nextBpm: number) => {
    setBpmState(nextBpm);
    engineRef.current.setBpm(nextBpm);
  }, []);

  const setInstrument = useCallback((nextInstrument: Instrument) => {
    setInstrumentState(nextInstrument);
    engineRef.current.setInstrument(nextInstrument);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;

    return () => {
      engine.stop();
      stopAnimation();
    };
  }, [pattern.id, stopAnimation]);

  useEffect(
    () => () => {
      stopAnimation();
      engineRef.current.dispose();
    },
    [stopAnimation],
  );

  return {
    isPlaying,
    bpm,
    loop,
    countIn,
    metronome,
    instrument,
    progress,
    activeStrokeIndex,
    engine: engineRef.current,
    setBpm,
    setLoop,
    setCountIn,
    setMetronome,
    setInstrument,
    start,
    stop,
    toggle,
  };
}
