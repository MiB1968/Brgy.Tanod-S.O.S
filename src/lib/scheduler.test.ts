import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleDailyLogReset } from './scheduler';

describe('scheduleDailyLogReset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('schedules for today at 7 AM if called before 7 AM', () => {
    // Set time to 5:00 AM
    const date = new Date(2023, 5, 15, 5, 0, 0);
    vi.setSystemTime(date);

    const onReset = vi.fn();
    const cleanup = scheduleDailyLogReset(onReset);

    // Fast-forward 1 hour (6:00 AM)
    vi.advanceTimersByTime(1000 * 60 * 60);
    expect(onReset).not.toHaveBeenCalled();

    // Fast-forward another 1 hour (7:00 AM)
    vi.advanceTimersByTime(1000 * 60 * 60);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledWith(expect.any(String));

    cleanup();
  });

  it('schedules for tomorrow at 7 AM if called after 7 AM', () => {
    // Set time to 8:00 AM
    const date = new Date(2023, 5, 15, 8, 0, 0);
    vi.setSystemTime(date);

    const onReset = vi.fn();
    const cleanup = scheduleDailyLogReset(onReset);

    // Fast-forward 22 hours (6:00 AM next day)
    vi.advanceTimersByTime(22 * 1000 * 60 * 60);
    expect(onReset).not.toHaveBeenCalled();

    // Fast-forward 1 hour (7:00 AM next day)
    vi.advanceTimersByTime(1000 * 60 * 60);
    expect(onReset).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('auto-reschedules for the next day after firing', () => {
    const date = new Date(2023, 5, 15, 5, 0, 0);
    vi.setSystemTime(date);

    const onReset = vi.fn();
    const cleanup = scheduleDailyLogReset(onReset);

    // Fast forward to 7:00 AM today
    vi.advanceTimersByTime(2 * 1000 * 60 * 60);
    expect(onReset).toHaveBeenCalledTimes(1);

    // Fast forward to 6:00 AM tomorrow
    vi.advanceTimersByTime(23 * 1000 * 60 * 60);
    expect(onReset).toHaveBeenCalledTimes(1);

    // Fast forward to 7:00 AM tomorrow
    vi.advanceTimersByTime(1 * 1000 * 60 * 60);
    expect(onReset).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('clears the timeout when cleanup function is called', () => {
    const date = new Date(2023, 5, 15, 5, 0, 0);
    vi.setSystemTime(date);

    const onReset = vi.fn();
    const cleanup = scheduleDailyLogReset(onReset);

    // Clear timeout before it runs
    cleanup();

    // Fast forward to 7:00 AM
    vi.advanceTimersByTime(2 * 1000 * 60 * 60);
    expect(onReset).not.toHaveBeenCalled();
  });
});
