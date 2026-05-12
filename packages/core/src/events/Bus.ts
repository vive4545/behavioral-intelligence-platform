import { Signal, SignalSchema } from '../types';

type SignalHandler = (signal: Signal) => void;

export class EventBus {
  private handlers: Set<SignalHandler> = new Set();

  subscribe(handler: SignalHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(signal: unknown) {
    const result = SignalSchema.safeParse(signal);
    if (!result.success) {
      console.error('[InterviewIQ] Invalid signal:', result.error);
      return;
    }

    this.handlers.forEach((handler) => handler(result.data));
  }
}
