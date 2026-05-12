import React from 'react';
import { createRoot } from 'react-dom/client';
import { InterviewSDK, SocketTransport } from '@interviewiq/core';
import { mouseTracker } from '@interviewiq/tracker-mouse';
import { keyboardTracker } from '@interviewiq/tracker-keyboard';
import { integrityTracker } from '@interviewiq/tracker-integrity';
import { SessionProvider } from '@interviewiq/react';
import { Playground } from './Playground';

const sdk = new InterviewSDK({
  apiKey: import.meta.env.VITE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6InRlc3QtdGVuYW50LTEiLCJlbmFibGVkVHJhY2tlcnMiOlsibW91c2UiLCJrZXlib2FyZCIsImludGVncml0eSJdLCJyYXRlTGltaXQiOjEwMDAsInJldGVudGlvbkRheXMiOjMwLCJpYXQiOjE3Nzg1ODIxMzJ9.i7DUb7fJ3gz-N_N8IiTbxagBrj19lIJL7zuee__GVdk',
  batchInterval: 1000, 
  transport: new SocketTransport({ url: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000' })
});

sdk.use(mouseTracker());
sdk.use(keyboardTracker());
sdk.use(integrityTracker());

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <SessionProvider sdk={sdk} serverUrl={import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000'}>
      <Playground />
    </SessionProvider>
  );
}
