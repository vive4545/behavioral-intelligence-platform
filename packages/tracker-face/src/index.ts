import { Plugin } from '@interviewiq/core';

export interface FaceTrackerConfig {
  distractionThresholdMs?: number;
  sampleRateMs?: number;
  workerPath?: string;
}

export const faceTracker = (config: FaceTrackerConfig = {}): Plugin => {
  const {
    distractionThresholdMs = 2000,
    sampleRateMs = 200,
    workerPath = '/workers/face-worker.js',
  } = config;

  let sdk: any;
  let worker: Worker | null = null;
  let stream: MediaStream | null = null;
  let interval: any;

  const startWorker = () => {
    worker = new Worker(workerPath);
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'face:update') {
        sdk?.emit('face:attention_score', { score: payload.attentionScore });
        if (payload.isDistracted) {
          sdk?.emit('face:distraction', { duration: distractionThresholdMs });
        }
        sdk?.emit('face:gaze_direction', { direction: payload.gazeDirection });
      }
    };
  };

  const processFrame = async (video: HTMLVideoElement) => {
    if (!worker) return;
    // Extract frame and send to worker
    // In a real app, we might use ImageCapture or Canvas
    worker.postMessage({ action: 'process', data: null });
  };

  return {
    name: 'tracker-face',
    onInit: (s: any) => {
      sdk = s;
    },
    onStart: async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        startWorker();

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        interval = setInterval(() => processFrame(video), sampleRateMs);
      } catch (err) {
        sdk?.emit('face:permission_denied', { error: err });
      }
    },
    onStop: () => {
      clearInterval(interval);
      stream?.getTracks().forEach(t => t.stop());
      worker?.terminate();
      worker = null;
    },
  };
};
