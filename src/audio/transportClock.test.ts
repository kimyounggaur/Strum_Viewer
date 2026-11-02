import { describe, expect, it, vi } from 'vitest';
import type { EngineEvent, EnginePosition, EngineStatus } from './AudioEngine';
import { createTransportClock } from './transportClock';

function fakeEngine() {
  const listeners = new Set<(event: EngineEvent) => void>();
  const engine = {
    status: 'idle' as EngineStatus,
    position: {
      status: 'idle',
      cycle: 0,
      progress: 0,
      activeStrokeIndex: -1,
      countIn: null,
      loopDuration: 4,
    } as EnginePosition,
    getPosition() {
      return { ...this.position, status: this.status };
    },
    subscribe(listener: (event: EngineEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setStatus(status: EngineStatus) {
      this.status = status;
      for (const listener of listeners) listener({ type: 'status', status });
    },
  };
  return engine;
}

function fakeScheduler() {
  const queue = new Map<number, () => void>();
  let nextId = 1;
  return {
    request: (callback: () => void) => {
      const id = nextId++;
      queue.set(id, callback);
      return id;
    },
    cancel: (id: number) => queue.delete(id),
    flush() {
      const callbacks = [...queue.values()];
      queue.clear();
      callbacks.forEach((callback) => callback());
    },
    get pending() {
      return queue.size;
    },
  };
}

describe('transportClock', () => {
  it('스냅샷은 이산 값이 바뀔 때만 통지하고, 프레임은 매번 전달한다', () => {
    const engine = fakeEngine();
    const scheduler = fakeScheduler();
    const clock = createTransportClock(engine, scheduler);
    const onSnapshot = vi.fn();
    const onFrame = vi.fn();
    clock.subscribeSnapshot(onSnapshot);
    clock.subscribeFrame(onFrame);

    engine.setStatus('playing');
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(scheduler.pending).toBe(1);

    engine.position = { ...engine.position, progress: 0.1, activeStrokeIndex: 0 };
    scheduler.flush();
    engine.position = { ...engine.position, progress: 0.2, activeStrokeIndex: 0 };
    scheduler.flush();
    engine.position = { ...engine.position, progress: 0.3, activeStrokeIndex: 1 };
    scheduler.flush();

    // playing 1회 + activeStrokeIndex 0→1 1회 + -1→0 1회
    expect(onSnapshot).toHaveBeenCalledTimes(3);
    expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(clock.getSnapshot()).toMatchObject({ status: 'playing', activeStrokeIndex: 1 });
  });

  it('일시정지·정지 시 rAF 루프를 멈춘다', () => {
    const engine = fakeEngine();
    const scheduler = fakeScheduler();
    const clock = createTransportClock(engine, scheduler);
    clock.subscribeSnapshot(() => {});

    engine.setStatus('playing');
    expect(scheduler.pending).toBe(1);
    engine.setStatus('paused');
    expect(scheduler.pending).toBe(0);
    expect(clock.getSnapshot().status).toBe('paused');

    engine.setStatus('playing');
    engine.setStatus('idle');
    expect(scheduler.pending).toBe(0);
    expect(clock.getSnapshot().status).toBe('idle');
  });

  it('getSnapshot은 변화가 없으면 같은 참조를 돌려준다(useSyncExternalStore 요건)', () => {
    const engine = fakeEngine();
    const clock = createTransportClock(engine, fakeScheduler());
    const first = clock.getSnapshot();
    clock.refresh();
    expect(clock.getSnapshot()).toBe(first);
  });
});
