import { ArrowDown, ArrowUp, CircleDotDashed, VolumeX } from 'lucide-react';
import type { StrumPattern } from '../data/strumTypes';

type StrokeLegendProps = {
  pattern: StrumPattern;
};

export function StrokeLegend({ pattern }: StrokeLegendProps) {
  if (!pattern.rhythm) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-900">스트로크 범례</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <ArrowDown className="h-4 w-4 text-teal-600" aria-hidden="true" />
          다운
        </span>
        <span className="inline-flex items-center gap-2">
          <ArrowUp className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          업
        </span>
        <span className="inline-flex items-center gap-2">
          <CircleDotDashed className="h-4 w-4 text-amber-600" aria-hidden="true" />
          악센트
        </span>
        <span className="inline-flex items-center gap-2">
          <VolumeX className="h-4 w-4 text-slate-500" aria-hidden="true" />
          쉼/뮤트
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        재생은 리듬 데이터 기준이며, 악보 표시는 원본 PNG를 그대로 사용합니다.
      </p>
    </div>
  );
}
