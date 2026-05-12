/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mouseTracker } from '../index';

describe('mouseTracker', () => {
  let sdk: any;
  let emit: any;

  beforeEach(() => {
    emit = vi.fn();
    sdk = { emit };
  });

  it('should initialize and start tracking', () => {
    const plugin = mouseTracker();
    plugin.onInit?.(sdk);
    plugin.onStart?.('session-1');

    const event = new MouseEvent('mousemove', { clientX: 100, clientY: 200 });
    document.dispatchEvent(event);

    expect(emit).toHaveBeenCalledWith('mouse:move', { x: 100, y: 200 });
  });

  it('should throttle mousemove events', () => {
    const plugin = mouseTracker({ throttleMs: 100 });
    plugin.onInit?.(sdk);
    plugin.onStart?.('session-1');

    document.dispatchEvent(new MouseEvent('mousemove'));
    document.dispatchEvent(new MouseEvent('mousemove'));

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('should detect rage clicks', () => {
    vi.useFakeTimers();
    const plugin = mouseTracker({ rageClickWindow: 1000, rageClickCount: 3 });
    plugin.onInit?.(sdk);
    plugin.onStart?.('session-1');

    document.dispatchEvent(new MouseEvent('mousedown'));
    document.dispatchEvent(new MouseEvent('mouseup'));
    document.dispatchEvent(new MouseEvent('mousedown'));
    document.dispatchEvent(new MouseEvent('mouseup'));
    document.dispatchEvent(new MouseEvent('mousedown'));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(emit).toHaveBeenCalledWith('mouse:rage_click', { count: 3 });
    vi.useRealTimers();
  });
});
