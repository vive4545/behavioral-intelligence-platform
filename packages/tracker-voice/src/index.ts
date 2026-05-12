import { Plugin } from '@interviewiq/core';

export interface VoiceTrackerConfig {
  fillerWords?: string[];
  silenceThresholdMs?: number;
  paceWindowMs?: number;
}

export const voiceTracker = (config: VoiceTrackerConfig = {}): Plugin => {
  const {
    fillerWords = ['um', 'uh', 'like', 'you know'],
    silenceThresholdMs = 2000,
    paceWindowMs = 10000,
  } = config;

  let sdk: any;
  let audioContext: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let recognition: any = null;

  const startAudioAnalysis = (stream: MediaStream) => {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);

    // Simple silence detection logic would go here
    // sdk?.emit('voice:silence_burst', ...)
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      fillerWords.forEach(word => {
        if (transcript.includes(word)) {
          sdk?.emit('voice:filler_word', { word });
        }
      });
      sdk?.emit('voice:fluency_update', { transcriptLength: transcript.length });
    };

    recognition.start();
  };

  return {
    name: 'tracker-voice',
    onInit: (s: any) => {
      sdk = s;
    },
    onStart: async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startAudioAnalysis(stream);
        startSpeechRecognition();
      } catch (err) {
        sdk?.emit('voice:permission_denied', { error: err });
      }
    },
    onStop: () => {
      stream?.getTracks().forEach(t => t.stop());
      audioContext?.close();
      recognition?.stop();
    },
  };
};
