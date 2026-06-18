import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StrumPattern } from '../data/strumTypes';

type MetronomeOptions = {
  bpm: number;
  pattern: StrumPattern;
  accent: boolean;
  sound: boolean;
  countIn: boolean;
};

type MetronomeState = {
  isRunning: boolean;
  currentStep: number;
  labels: string[];
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
};

function labelsFor(pattern: StrumPattern): string[] {
  if (pattern.feel === 'sixteenth' || pattern.feel === 'country') {
    return ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'];
  }

  if (pattern.timeSignature === '3/4') {
    return ['1', '&', '2', '&', '3', '&'];
  }

  if (pattern.timeSignature === '6/8') {
    return ['1', '&', 'a', '2', '&', 'a'];
  }

  if (pattern.timeSignature === '12/8' || pattern.feel === 'triplet' || pattern.feel === 'shuffle') {
    return ['1', '&', 'a', '2', '&', 'a', '3', '&', 'a', '4', '&', 'a'];
  }

  return ['1', '&', '2', '&', '3', '&', '4', '&'];
}

function beatSteps(pattern: StrumPattern): number {
  if (pattern.feel === 'sixteenth' || pattern.feel === 'country') return 4;
  if (pattern.timeSignature === '6/8' || pattern.timeSignature === '12/8') return 3;
  if (pattern.feel === 'triplet' || pattern.feel === 'shuffle') return 3;
  return 2;
}

function playClick(context: AudioContext, time: number, accent: boolean, sound: boolean) {
  if (!sound) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(accent ? 1320 : 880, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.07);
}

export function useMetronome({ bpm, pattern, accent, sound, countIn }: MetronomeOptions): MetronomeState {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextTickRef = useRef(0);
  const stepRef = useRef(0);
  const startedRef = useRef(false);
  const optionsRef = useRef({ bpm, pattern, accent, sound, countIn });
  const labels = useMemo(() => labelsFor(pattern), [pattern]);

  useEffect(() => {
    optionsRef.current = { bpm, pattern, accent, sound, countIn };
  }, [accent, bpm, countIn, pattern, sound]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRunning(false);
    setCurrentStep(0);
    stepRef.current = 0;
    startedRef.current = false;
  }, []);

  const scheduler = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;

    const { bpm: liveBpm, pattern: livePattern, accent: liveAccent, sound: liveSound } = optionsRef.current;
    const steps = labelsFor(livePattern).length;
    const subdivisions = beatSteps(livePattern);
    const stepSeconds = 60 / liveBpm / subdivisions;

    while (nextTickRef.current < context.currentTime + 0.12) {
      const step = stepRef.current % steps;
      const strong = liveAccent && step % subdivisions === 0;
      playClick(context, nextTickRef.current, strong, liveSound);

      window.setTimeout(() => {
        setCurrentStep(step);
      }, Math.max(0, (nextTickRef.current - context.currentTime) * 1000));

      stepRef.current += 1;
      nextTickRef.current += stepSeconds;
    }
  }, []);

  const start = useCallback(async () => {
    if (startedRef.current) return;

    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    await context.resume();

    const { bpm: liveBpm, pattern: livePattern, countIn: liveCountIn } = optionsRef.current;
    const subdivisions = beatSteps(livePattern);
    const countInDelay = liveCountIn ? (60 / liveBpm) * (livePattern.timeSignature === '3/4' ? 3 : 4) : 0.05;

    nextTickRef.current = context.currentTime + countInDelay;
    stepRef.current = 0;
    startedRef.current = true;
    setIsRunning(true);

    if (liveCountIn) {
      const beats = livePattern.timeSignature === '3/4' ? 3 : livePattern.timeSignature === '6/8' ? 2 : 4;
      for (let beat = 0; beat < beats; beat += 1) {
        playClick(context, context.currentTime + beat * (60 / liveBpm), beat === 0, true);
      }
      window.setTimeout(() => setCurrentStep(0), Math.max(0, countInDelay * 1000));
    }

    timerRef.current = window.setInterval(scheduler, 25);
    scheduler();
  }, [scheduler]);

  const toggle = useCallback(async () => {
    if (isRunning) {
      stop();
      return;
    }

    await start();
  }, [isRunning, start, stop]);

  useEffect(() => stop, [stop]);

  return {
    isRunning,
    currentStep,
    labels,
    start,
    stop,
    toggle,
  };
}
