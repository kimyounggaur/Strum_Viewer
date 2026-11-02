import type { StrumPattern } from '../../data/strumTypes';
import type { Transport } from '../../hooks/useTransport';
import { StrokeLegend } from './StrokeLegend';
import { TransportBar } from './TransportBar';

type PracticePanelProps = {
  pattern: StrumPattern;
  transport: Transport;
};

/**
 * 연습 패널. 리듬 데이터가 없는 패턴도 엔진이 박자표 기반 클릭 리듬으로 재생하므로
 * 별도 메트로놈 UI 없이 같은 트랜스포트를 쓴다.
 */
export function PracticePanel({ pattern, transport }: PracticePanelProps) {
  return (
    <div className="space-y-4">
      <TransportBar pattern={pattern} transport={transport} />
      <StrokeLegend pattern={pattern} />
    </div>
  );
}
