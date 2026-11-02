/**
 * 리듬 전사 데이터에서 패턴 메타데이터를 유도한다.
 * (prepareStrumAssets.mjs와 테스트가 공유하는 순수 함수)
 */

/** feelTiming + subdivision → 학생에게 보여줄 "세는 느낌" */
export function countingFeelOf(rhythm) {
  if (!rhythm) return null;
  switch (rhythm.feelTiming) {
    case 'swing':
      return 'swing';
    case 'triplet':
      return 'triplet';
    case 'compound':
      return 'compound';
    default:
      return rhythm.subdivision >= 4 ? 'straight-16' : 'straight-8';
  }
}

/** 오프비트 판정 기준이 되는 "펄스" 간격(칸 수) */
function pulseCells(rhythm) {
  // 겹박자 16분 그리드(6/8, subdivision 6): 8분음표(2칸)가 펄스
  if (rhythm.feelTiming === 'compound' && rhythm.subdivision === 6) return 2;
  return rhythm.subdivision;
}

/**
 * 난이도 자동 점수 (0~1). 수동 태깅 전 임시값이자, 수동값이 없는 신규 패턴의 기본값.
 *   offbeat  펄스 위에 있지 않은 스트로크 비율 (싱코페이션)
 *   up       업스트로크 비율
 *   density  스트로크 수 / 루프 칸 수
 *   tie      붙임줄 유무
 */
export function difficultyScore(rhythm, beatsPerBar) {
  const strokes = rhythm.strokes ?? [];
  if (strokes.length === 0) return 0;
  const bars = Math.max(1, Math.round(rhythm.bars ?? 1));
  const cells = beatsPerBar * bars * rhythm.subdivision;
  const pulse = pulseCells(rhythm);
  const offbeat = strokes.filter((stroke) => stroke.step % pulse !== 0).length / strokes.length;
  const up = strokes.filter((stroke) => stroke.dir === 'up').length / strokes.length;
  const density = strokes.length / cells;
  const tie = strokes.some((stroke) => stroke.tie) ? 1 : 0;
  return 0.45 * offbeat + 0.3 * up + 0.15 * density + 0.1 * tie;
}

export function difficultyFromScore(score) {
  if (score < 0.35) return 'beginner';
  if (score < 0.55) return 'intermediate';
  return 'advanced';
}

/** rhythms.source.json의 confidence 표기를 앱용 값으로 정규화 */
export function normalizeConfidence(raw) {
  const value = String(raw ?? '');
  return {
    confidence: value.startsWith('verified') ? 'verified' : 'approx',
    source: value.endsWith('remote') ? 'remote' : 'local',
  };
}
