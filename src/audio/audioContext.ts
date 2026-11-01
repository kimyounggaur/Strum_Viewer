/**
 * 앱 전체가 공유하는 AudioContext 하나.
 *
 * - 브라우저는 탭당 AudioContext 수를 제한하므로(Safari 4개, Chrome 6개) 미리듣기·
 *   트랜스포트가 각자 만들지 않고 이 모듈을 통해 하나만 쓴다.
 * - 모듈 로드 시점에 만들지 않고 첫 호출에서 만든다(자동재생 정책 경고 방지).
 */
let sharedContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext({ latencyHint: 'interactive' });
  }
  return sharedContext;
}

/** 사용자 제스처 핸들러 안에서 호출해야 한다. suspended 상태면 resume한다. */
export async function unlockAudio(): Promise<AudioContext> {
  const context = getAudioContext();
  if (context.state !== 'running') {
    await context.resume();
  }
  return context;
}

/** 테스트에서 가짜 컨텍스트를 주입할 때만 사용한다. */
export function setAudioContextForTesting(context: AudioContext | null): void {
  sharedContext = context;
}
