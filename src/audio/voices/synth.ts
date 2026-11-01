import type { Instrument, Stroke } from '../../data/strumTypes';

/**
 * 합성 음색. 모든 함수는 만든 소스 노드를 반환한다.
 * 엔진은 반환된 노드를 추적해 정지 시 즉시 끊는다.
 */
type VoiceProfile = {
  frequencies: number[];
  decay: number;
  lowPass: number;
  gain: number;
};

const guitarProfile: VoiceProfile = {
  frequencies: [82.41, 110, 146.83, 196, 246.94, 329.63],
  decay: 0.72,
  lowPass: 2600,
  gain: 0.15,
};

const ukuleleProfile: VoiceProfile = {
  frequencies: [392, 261.63, 329.63, 440],
  decay: 0.48,
  lowPass: 3300,
  gain: 0.13,
};

function profileFor(instrument: Instrument): VoiceProfile {
  return instrument === 'ukulele' ? ukuleleProfile : guitarProfile;
}

function playString(
  context: BaseAudioContext,
  destination: AudioNode,
  frequency: number,
  time: number,
  gainValue: number,
  decay: number,
): AudioScheduledSourceNode {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.004, time + 0.04);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(gainValue, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + decay + 0.05);
  return oscillator;
}

/** 쉼표·붙임줄은 소리를 내지 않으므로 빈 배열을 반환한다. */
export function playStrum(
  context: BaseAudioContext,
  time: number,
  stroke: Stroke,
  instrument: Instrument,
  destination: AudioNode,
): AudioScheduledSourceNode[] {
  if (stroke.dir === 'rest' || stroke.tie) {
    return [];
  }

  const profile = profileFor(instrument);
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(stroke.dir === 'mute' ? 1200 : profile.lowPass, time);
  filter.Q.setValueAtTime(0.7, time);
  filter.connect(destination);

  if (stroke.dir === 'mute') {
    return [playMute(context, filter, time, stroke.accent ? 0.16 : 0.1)];
  }

  const frequencies =
    stroke.dir === 'up' ? [...profile.frequencies].reverse() : profile.frequencies;
  const spacing = instrument === 'ukulele' ? 0.008 : 0.01;
  const gain = profile.gain * (stroke.accent ? 1.45 : 1);

  return frequencies.map((frequency, index) =>
    playString(
      context,
      filter,
      frequency,
      time + index * spacing,
      gain / frequencies.length,
      profile.decay,
    ),
  );
}

function playMute(
  context: BaseAudioContext,
  destination: AudioNode,
  time: number,
  gainValue: number,
): AudioScheduledSourceNode {
  const bufferSize = Math.floor(context.sampleRate * 0.06);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const samples = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.setValueAtTime(gainValue, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);
  source.buffer = buffer;
  source.connect(gain).connect(destination);
  source.start(time);
  source.stop(time + 0.07);
  return source;
}

export function playMetronomeClick(
  context: BaseAudioContext,
  time: number,
  accent: boolean,
  destination: AudioNode,
): AudioScheduledSourceNode[] {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(accent ? 1568 : 1174.66, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.15 : 0.085, time + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.07);
  return [oscillator];
}
