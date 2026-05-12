import React, { useState } from 'react';
import { useSession, useConfidenceScore, useSignals, useTrackerStatus } from '@interviewiq/react';

export const Playground: React.FC = () => {
  const { sdk, sessionId, status, start, end, grantConsent } = useSession() as any;
  const score = useConfidenceScore();
  const signals = useSignals();
  const { attached } = useTrackerStatus();

  const [simulatedEvent, setSimulatedEvent] = useState('mouse:move');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>InterviewIQ SDK Playground</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <section>
          <h2>Controls</h2>
          <p>Session ID: <code>{sessionId || 'N/A'}</code></p>
          <p>Status: <strong>{status}</strong></p>
          
          <button onClick={() => start()}>Start Session</button>
          <button onClick={() => grantConsent(['mouse', 'keyboard'])}>Grant Consent</button>
          <button onClick={() => end()}>End Session</button>

          <h3>Simulate Signals</h3>
          <select value={simulatedEvent} onChange={(e) => setSimulatedEvent(e.target.value)}>
            <option value="mouse:move">Mouse Move</option>
            <option value="mouse:rage_click">Rage Click</option>
            <option value="integrity:tab_switch">Tab Switch</option>
          </select>
          <button onClick={() => {
            let payload: any = { manual: true, timestamp: Date.now() };
            
            if (simulatedEvent === 'integrity:tab_switch') {
              payload.severity = 'high';
              payload.reason = 'Candidate left the page';
            } else if (simulatedEvent === 'mouse:rage_click') {
              payload.burstCount = 10;
            }

            sdk.emit(simulatedEvent, payload);
          }}>Fire Signal</button>
        </section>

        <section>
          <h2>Live Score</h2>
          <pre>{JSON.stringify(score, null, 2)}</pre>
          
          <h2>Signal Log</h2>
          <div style={{ height: '300px', overflowY: 'auto', background: '#f0f0f0', padding: '10px' }}>
            {signals.map((s, i) => (
              <div key={i} style={{ fontSize: '12px', borderBottom: '1px solid #ccc' }}>
                [{new Date(s.timestamp).toLocaleTimeString()}] {s.type}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
