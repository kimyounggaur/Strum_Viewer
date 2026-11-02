import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { EnginePosition } from '../audio/AudioEngine';
import { transportClock } from '../audio/engineInstance';
import type { TransportSnapshot } from '../audio/transportClock';

/** 상태·현재 스트로크·카운트인. 값이 바뀔 때만 리렌더된다. */
export function useTransportSnapshot(): TransportSnapshot {
  return useSyncExternalStore(
    transportClock.subscribeSnapshot,
    transportClock.getSnapshot,
    transportClock.getSnapshot,
  );
}

/**
 * 매 프레임 위치를 받는다. 콜백 안에서 ref로 DOM을 직접 갱신할 것.
 * (React state를 바꾸면 60fps 리렌더가 되므로 금지)
 */
export function usePlayheadFrame(callback: (position: EnginePosition) => void): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });
  useEffect(() => transportClock.subscribeFrame((position) => callbackRef.current(position)), []);
}
