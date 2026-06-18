import { Guitar, Pause, Play, Repeat, Timer, Volume2 } from 'lucide-react';
import type { Instrument, StrumPattern } from '../data/strumTypes';
import { IconButton } from './IconButton';

type TransportBarProps = {
  pattern: StrumPattern;
  isPlaying: boolean;
  bpm: number;
  loop: boolean;
  countIn: boolean;
  metronome: boolean;
  instrument: Instrument;
  onBpmChange: (bpm: number) => void;
  onLoopChange: (loop: boolean) => void;
  onCountInChange: (countIn: boolean) => void;
  onMetronomeChange: (metronome: boolean) => void;
  onInstrumentChange: (instrument: Instrument) => void;
  onToggle: () => void;
  onStop: () => void;
};

export function TransportBar({
  pattern,
  isPlaying,
  bpm,
  loop,
  countIn,
  metronome,
  instrument,
  onBpmChange,
  onLoopChange,
  onCountInChange,
  onMetronomeChange,
  onInstrumentChange,
  onToggle,
  onStop,
}: TransportBarProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">스트럼 재생</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {pattern.rhythm ? `${pattern.rhythm.beatsPerBar}박 기준` : '메트로놈 모드'}
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton label={isPlaying ? '일시정지' : '재생'} active={isPlaying} onClick={onToggle}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconButton>
          <IconButton label="정지" onClick={onStop}>
            <span className="h-3.5 w-3.5 rounded-[3px] bg-current" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="transport-bpm">
        BPM {bpm}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          id="transport-bpm"
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
          aria-label="BPM 숫자 입력"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onLoopChange(!loop)}
          className={toggleClass(loop)}
          aria-pressed={loop}
        >
          <Repeat className="h-4 w-4" aria-hidden="true" />
          루프
        </button>
        <button
          type="button"
          onClick={() => onCountInChange(!countIn)}
          className={toggleClass(countIn)}
          aria-pressed={countIn}
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          카운트인
        </button>
        <button
          type="button"
          onClick={() => onMetronomeChange(!metronome)}
          className={toggleClass(metronome)}
          aria-pressed={metronome}
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          클릭
        </button>
        <button
          type="button"
          onClick={() => onInstrumentChange(instrument === 'guitar' ? 'ukulele' : 'guitar')}
          className={toggleClass(true)}
          aria-label="악기 전환"
        >
          <Guitar className="h-4 w-4" aria-hidden="true" />
          {instrument === 'guitar' ? '기타' : '우쿨렐레'}
        </button>
      </div>
    </div>
  );
}

function toggleClass(active: boolean): string {
  return [
    'inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition',
    active
      ? 'border-teal-500 bg-teal-50 text-teal-700'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  ].join(' ');
}
