// Face Mesh Worker
// In a real implementation, this would import @mediapipe/face_mesh

self.onmessage = async (event) => {
  const { action, data } = event.data;

  if (action === 'process') {
    // Mock processing for now
    // Real logic would use MediaPipe to get landmarks and calculate attention
    const attentionScore = Math.random(); 
    const isDistracted = attentionScore < 0.5;

    self.postMessage({
      type: 'face:update',
      payload: {
        attentionScore,
        isDistracted,
        gazeDirection: attentionScore > 0.8 ? 'center' : 'away'
      }
    });
  }
};
