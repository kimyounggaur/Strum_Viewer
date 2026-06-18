import { Pause, Play, Timer, Volume2, VolumeX } from 'lucide-react';
import type { StrumPattern } from '../data/strumTypes';
import { useMetronome } from '../hooks/useMetronome';
import { IconButton } from './IconButton';

type MetronomeControlsProps = {
  pattern: StrumPattern;
  bpm: number;
  accent: boolean;
  sound: boolean;
  countIn: boolean;
  onBpmChange: (bpm: number) => void;
  onAccentChange: (accent: boolean) => void;
  onSoundChange: (sound: boolean) => void;
  onCountInChange: (countIn: boolean) => void;
};

export function MetronomeControls({
  pattern,
  bpm,
  accent,
  sound,
  countIn,
  onBpmChange,
  onAccentChange,
  onSoundChange,
  onCountInChange,
}: MetronomeControlsProps) {
  const metronome = useMetronome({ bpm, pattern, accent, sound, countIn });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">메트로놈</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">원본 PNG 기준 Core 연습</p>
        </div>
        <IconButton label={metronome.isRunning ? '정지' : '시작'} active={metronome.isRunning} onClick={metronome.toggle}>
          {metronome.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="metronome-bpm">
        BPM {bpm}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id="metronome-bpm"
          type="range"
          min={pattern.recommendedBpm.min}
          max={pattern.recommendedBpm.max}
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
          className="w-full accent-teal-600"
        />
        <input
          type="number"
          min={40}
          max={220}
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
          className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm font-bold text-slate-900"
          aria-label="메트로놈 BPM 숫자 입력"
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" className={toggleClass(accent)} onClick={() => onAccentChange(!accent)}>
          <Timer className="h-4 w-4" aria-hidden="true" />
          강박
        </button>
        <button type="button" className={toggleClass(countIn)} onClick={() => onCountInChange(!countIn)}>
          <Timer className="h-4 w-4" aria-hidden="true" />
          카운트
        </button>
        <button type="button" className={toggleClass(sound)} onClick={() => onSoundChange(!sound)}>
          {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          소리
        </button>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {metronome.labels.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className={[
              'grid h-10 min-w-0 place-items-center rounded-lg border text-sm font-black transition',
              metronome.isRunning && metronome.currentStep === index
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-slate-50 text-slate-500',
            ].join(' ')}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function toggleClass(active: boolean): string {
  return [
    'inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-2 text-sm font-bold transition',
    active
      ? 'border-teal-500 bg-teal-50 text-teal-700'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  ].join(' ');
}
