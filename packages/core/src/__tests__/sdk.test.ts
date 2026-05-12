import { describe, it, expect, vi } from 'vitest';
import { InterviewSDK } from '../index';

describe('InterviewSDK', () => {
  it('should initialize with an API key', () => {
    const sdk = new InterviewSDK({ apiKey: 'test-key' });
    expect(sdk).toBeDefined();
  });

  it('should start and end a session', () => {
    const sdk = new InterviewSDK({ apiKey: 'test-key' });
    const sessionId = sdk.startSession();
    expect(sessionId).toBeDefined();
    expect(sdk.getSessionId()).toBe(sessionId);

    const endedId = sdk.endSession();
    expect(endedId).toBe(sessionId);
    expect(sdk.getSessionId()).toBeNull();
  });

  it('should emit signals when a session is active', () => {
    const onSignal = vi.fn();
    const sdk = new InterviewSDK({ 
      apiKey: 'test-key',
      hooks: { onSignal }
    });

    sdk.startSession();
    sdk.emit('test-event', { foo: 'bar' });

    expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
      type: 'test-event',
      payload: { foo: 'bar' }
    }));
  });

  it('should not emit signals when no session is active', () => {
    const onSignal = vi.fn();
    const sdk = new InterviewSDK({ 
      apiKey: 'test-key',
      hooks: { onSignal }
    });

    sdk.emit('test-event', { foo: 'bar' });
    expect(onSignal).not.toHaveBeenCalled();
  });
});
