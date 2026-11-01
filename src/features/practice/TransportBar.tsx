import { Pause, Play, Repeat, Square, Timer, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import type { Mix } from '../../audio/timeline';
import type { Instrument, StrumPattern } from '../../data/strumTypes';
import { BPM_MAX, BPM_MIN, type Transport } from '../../hooks/useTransport';
import { barCount, loopBeats } from '../../lib/rhythm';

type TransportBarProps = {
  pattern: StrumPattern;
  transport: Transport;
};

const mixOptions: Array<{ value: Mix; label: string }> = [
  { value: 'both', label: '스트럼+클릭' },
  { value: 'strum', label: '스트럼만' },
  { value: 'click', label: '클릭만' },
];

const instrumentOptions: Array<{ value: Instrument; label: string }> = [
  { value: 'guitar', label: '기타' },
  { value: 'ukulele', label: '우쿨렐레' },
];

export function TransportBar({ pattern, transport }: TransportBarProps) {
  const { status, isRunning, bpm, options } = transport;
  const rhythm = pattern.rhythm;
  const recommended = pattern.recommendedBpm;

  const playLabel = isRunning ? '일시정지' : status === 'paused' ? '이어서 재생' : '재생';
  const loopInfo = rhythm
    ? `${barCount(rhythm) > 1 ? `${barCount(rhythm)}마디 · ` : ''}${loopBeats(rhythm)}박 루프`
    : '메트로놈';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900">스트럼 재생</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {loopInfo}
            {status === 'counting-in' ? ' · 카운트 중' : status === 'paused' ? ' · 일시정지' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton
            label={`${playLabel} (Space)`}
            active={isRunning}
            onClick={() => void transport.toggle()}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton label="정지" onClick={transport.stop} disabled={status === 'idle'}>
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <BpmControl
        bpm={bpm}
        recommendedMin={recommended.min}
        recommendedMax={recommended.max}
        onChange={transport.setBpm}
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => transport.setOptions({ loop: !options.loop })}
          className={toggleClass(options.loop)}
          aria-pressed={options.loop}
        >
          <Repeat className="h-4 w-4" aria-hidden="true" />
          루프
        </button>
        <button
          type="button"
          onClick={() => transport.setOptions({ countIn: !options.countIn })}
          className={toggleClass(options.countIn)}
          aria-pressed={options.countIn}
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          카운트인
        </button>
      </div>

      <Segmented
        label="소리"
        options={mixOptions}
        value={options.mix}
        onChange={(mix) => transport.setOptions({ mix })}
      />
      <Segmented
        label="음색"
        options={instrumentOptions}
        value={options.instrument}
        onChange={(instrument) => transport.setOptions({ instrument })}
      />

      <VolumeControl
        volume={options.volume}
        onChange={(volume) => transport.setOptions({ volume })}
      />
    </div>
  );
}

type BpmControlProps = {
  bpm: number;
  recommendedMin: number;
  recommendedMax: number;
  onChange: (bpm: number) => void;
};

/** 숫자칸은 입력 중 자유롭게 두고, 유효할 때만 반영하며 포커스를 잃으면 범위로 맞춘다. */
function BpmControl({ bpm, recommendedMin, recommendedMax, onChange }: BpmControlProps) {
  // 편집 중에만 초안을 쓰고, 아니면 항상 실제 BPM을 보여준다(동기화 effect 불필요).
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (text: string) => {
    const value = Number(text);
    if (text.trim() !== '' && Number.isFinite(value)) {
      onChange(value);
    }
  };

  const span = BPM_MAX - BPM_MIN;
  const left = ((recommendedMin - BPM_MIN) / span) * 100;
  const width = ((recommendedMax - recommendedMin) / span) * 100;

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-bold text-slate-700" htmlFor="transport-bpm">
          BPM {bpm}
        </label>
        <span className="text-xs font-semibold text-slate-500">
          추천 {recommendedMin}–{recommendedMax}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative w-full">
          <input
            id="transport-bpm"
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            value={bpm}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-valuetext={`${bpm} BPM`}
            className="relative z-10 w-full accent-teal-600"
          />
          <span
            className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-teal-100"
            style={{ left: `${left}%`, width: `${width}%` }}
            aria-hidden="true"
          />
        </div>
        <input
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          value={draft ?? String(bpm)}
          onFocus={() => setDraft(String(bpm))}
          onChange={(event) => {
            setDraft(event.target.value);
            const value = Number(event.target.value);
            if (event.target.value !== '' && value >= BPM_MIN && value <= BPM_MAX) {
              onChange(value);
            }
          }}
          onBlur={(event) => {
            commit(event.target.value);
            setDraft(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-sm font-bold text-slate-900"
          aria-label="BPM 숫자 입력"
        />
      </div>
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs font-bold text-slate-500" id={`segment-${label}`}>
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`segment-${label}`}
        className="grid gap-1 rounded-lg bg-slate-100 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={[
                'h-9 rounded-md px-2 text-sm font-bold transition',
                checked
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VolumeControl({ volume, onChange }: { volume: number; onChange: (v: number) => void }) {
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const percent = Math.round(volume * 100);
  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(volume === 0 ? 0.9 : 0)}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label={volume === 0 ? '음소거 해제' : '음소거'}
        title={volume === 0 ? '음소거 해제' : '음소거'}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
      <label className="sr-only" htmlFor="transport-volume">
        볼륨
      </label>
      <input
        id="transport-volume"
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        aria-valuetext={`${percent}%`}
        className="w-full accent-teal-600"
      />
      <span className="w-10 text-right text-xs font-bold text-slate-500">{percent}%</span>
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
