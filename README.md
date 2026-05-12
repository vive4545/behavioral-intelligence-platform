# InterviewIQ Behavioral Intelligence Platform 🧠

InterviewIQ is an enterprise-grade Behavioral Intelligence SDK designed to monitor, analyze, and score candidate behavior during digital interviews. It provides real-time insights into engagement, focus, and integrity through non-invasive signal tracking.

## 🚀 Key Features

- **Real-time Scoring**: Dynamic confidence and suspicion metrics calculated via AI.
- **Privacy First**: Explicit consent gates and GDPR-compliant data purging.
- **Signal Tracking**: High-fidelity tracking for Mouse, Keyboard, Face, and Tab Switches.
- **Isomorphic Support**: Seamlessly works in Browser and Node.js environments.
- **Modular Plugin System**: Easily add custom trackers (Face, Voice, etc.).

## 📦 Workspace Structure

- `@interviewiq/core`: The core orchestration engine and transport layer.
- `@interviewiq/react`: High-level React hooks (`useSession`, `useConfidenceScore`).
- `@interviewiq/server`: Behavioral analysis engine and signal ingestion server.
- `apps/playground`: A full Vite-based developer playground for testing signals.

## 🛠 Quick Start

### 1. Installation
```bash
npm install @interviewiq/react @interviewiq/core
```

### 2. Frontend Integration (React)
```tsx
import { SessionProvider, useSession } from '@interviewiq/react';
import { InterviewSDK } from '@interviewiq/core';

const sdk = new InterviewSDK({ 
  apiKey: 'YOUR_API_KEY',
  transport: new SocketTransport({ url: 'https://api.yourdomain.com' })
});

function App() {
  return (
    <SessionProvider sdk={sdk}>
      <InterviewInterface />
    </SessionProvider>
  );
}
```

### 3. Server Setup
```typescript
import { InterviewServer } from '@interviewiq/server';
import { MongoAdapter } from '@interviewiq/server/storage';

const server = new InterviewServer({
  storage: new MongoAdapter(),
  secret: 'your-jwt-secret',
  port: 3000
});

server.listen();
```

## 🧪 Development & Testing

Run the entire platform locally with one command:
```bash
npm run dev
```

The playground will be available at `http://localhost:5173`.

---
© 2026 InterviewIQ Intelligence. All rights reserved.
