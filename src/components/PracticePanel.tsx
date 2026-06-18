import { useEffect, useState } from 'react';
import type { StrumPattern } from '../data/strumTypes';
import { useTransport } from '../hooks/useTransport';
import { MetronomeControls } from './MetronomeControls';
import { StrokeLegend } from './StrokeLegend';
import { TransportBar } from './TransportBar';

type PracticePanelProps = {
  pattern: StrumPattern;
  onTransportChange: (state: {
    isPlaying: boolean;
    progress: number;
    activeStrokeIndex: number;
  }) => void;
};

export function PracticePanel({ pattern, onTransportChange }: PracticePanelProps) {
  const transport = useTransport(pattern);
  const [metronomeBpm, setMetronomeBpm] = useState(pattern.recommendedBpm.default);
  const [accent, setAccent] = useState(true);
  const [sound, setSound] = useState(true);
  const [countIn, setCountIn] = useState(false);

  useEffect(() => {
    setMetronomeBpm(pattern.recommendedBpm.default);
  }, [pattern.id, pattern.recommendedBpm.default]);

  useEffect(() => {
    onTransportChange({
      isPlaying: transport.isPlaying,
      progress: transport.progress,
      activeStrokeIndex: transport.activeStrokeIndex,
    });
  }, [onTransportChange, transport.activeStrokeIndex, transport.isPlaying, transport.progress]);

  if (pattern.rhythm) {
    return (
      <div className="space-y-4">
        <TransportBar
          pattern={pattern}
          isPlaying={transport.isPlaying}
          bpm={transport.bpm}
          loop={transport.loop}
          countIn={transport.countIn}
          metronome={transport.metronome}
          instrument={transport.instrument}
          onBpmChange={transport.setBpm}
          onLoopChange={transport.setLoop}
          onCountInChange={transport.setCountIn}
          onMetronomeChange={transport.setMetronome}
          onInstrumentChange={transport.setInstrument}
          onToggle={() => {
            void transport.toggle();
          }}
          onStop={transport.stop}
        />
        <StrokeLegend pattern={pattern} />
      </div>
    );
  }

  return (
    <MetronomeControls
      pattern={pattern}
      bpm={metronomeBpm}
      accent={accent}
      sound={sound}
      countIn={countIn}
      onBpmChange={setMetronomeBpm}
      onAccentChange={setAccent}
      onSoundChange={setSound}
      onCountInChange={setCountIn}
    />
  );
}
