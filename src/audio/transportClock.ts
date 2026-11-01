import type { AudioEngine, EnginePosition, EngineStatus } from './AudioEngine';

/**
 * 엔진 위치를 UI로 보내는 rAF 루프 1개.
 *
 * - 이산 스냅샷(status·cycle·activeStrokeIndex·countIn)은 값이 바뀔 때만 구독자에게 알린다.
 *   React 컴포넌트는 useSyncExternalStore로 구독해 "바뀔 때만" 리렌더된다.
 * - 연속 프레임(progress)은 frame 구독자에게 매 프레임 전달한다. 재생선처럼 DOM을
 *   ref로 직접 갱신하는 곳에서만 쓴다(React state 경유 금지 → 60fps 리렌더 방지).
 */
export type TransportSnapshot = {
  status: EngineStatus;
  cycle: number;
  activeStrokeIndex: number;
  countIn: { beat: number; beats: number } | null;
};

export type FrameListener = (position: EnginePosition) => void;

export type TransportClock = {
  getSnapshot: () => TransportSnapshot;
  subscribeSnapshot: (listener: () => void) => () => void;
  subscribeFrame: (listener: FrameListener) => () => void;
  /** 루프 밖에서 현재 위치를 한 번 계산해 전파한다(상태 변화 직후 등). */
  refresh: () => void;
};

type Scheduler = {
  request: (callback: () => void) => number;
  cancel: (id: number) => void;
};

const browserScheduler: Scheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

function sameSnapshot(a: TransportSnapshot, b: TransportSnapshot): boolean {
  return (
    a.status === b.status &&
    a.cycle === b.cycle &&
    a.activeStrokeIndex === b.activeStrokeIndex &&
    a.countIn?.beat === b.countIn?.beat &&
    a.countIn?.beats === b.countIn?.beats
  );
}

export function createTransportClock(
  engine: Pick<AudioEngine, 'getPosition' | 'subscribe' | 'status'>,
  scheduler: Scheduler = browserScheduler,
): TransportClock {
  let snapshot: TransportSnapshot = {
    status: 'idle',
    cycle: 0,
    activeStrokeIndex: -1,
    countIn: null,
  };
  const snapshotListeners = new Set<() => void>();
  const frameListeners = new Set<FrameListener>();
  let frameId: number | null = null;
  let wired = false;

  function publish(position: EnginePosition) {
    const next: TransportSnapshot = {
      status: position.status,
      cycle: position.cycle,
      activeStrokeIndex: position.activeStrokeIndex,
      countIn: position.countIn,
    };
    if (!sameSnapshot(snapshot, next)) {
      snapshot = next;
      for (const listener of [...snapshotListeners]) listener();
    }
    for (const listener of [...frameListeners]) listener(position);
  }

  const isRunning = () => engine.status === 'playing' || engine.status === 'counting-in';

  function loop() {
    frameId = null;
    publish(engine.getPosition());
    if (isRunning()) {
      frameId = scheduler.request(loop);
    }
  }

  function ensureLoop() {
    if (frameId === null && isRunning()) {
      frameId = scheduler.request(loop);
    }
  }

  function wire() {
    if (wired) return;
    wired = true;
    engine.subscribe((event) => {
      if (event.type !== 'status') return;
      publish(engine.getPosition());
      if (isRunning()) {
        ensureLoop();
      } else if (frameId !== null) {
        scheduler.cancel(frameId);
        frameId = null;
      }
    });
  }

  return {
    getSnapshot: () => snapshot,
    subscribeSnapshot(listener) {
      wire();
      snapshotListeners.add(listener);
      return () => {
        snapshotListeners.delete(listener);
      };
    },
    subscribeFrame(listener) {
      wire();
      frameListeners.add(listener);
      listener(engine.getPosition());
      ensureLoop();
      return () => {
        frameListeners.delete(listener);
      };
    },
    refresh() {
      publish(engine.getPosition());
    },
  };
}
