import { AudioEngine } from './AudioEngine';
import { createTransportClock } from './transportClock';

/** 앱 전체가 공유하는 엔진 1개 (상세 재생·카드 미리듣기 공용). */
export const engine = new AudioEngine();

/** 엔진 위치를 React에 전달하는 rAF 시계 1개. */
export const transportClock = createTransportClock(engine);
