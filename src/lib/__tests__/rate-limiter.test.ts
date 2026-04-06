import { describe, it, expect, vi, afterEach } from 'vitest';
import { isOnCooldown } from '../rate-limiter';

describe('isOnCooldown', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna false na primeira chamada', () => {
    expect(isOnCooldown('test-action-unique-1')).toBe(false);
  });

  it('retorna true se chamado dentro do cooldown', () => {
    isOnCooldown('test-action-unique-2', 5000);
    expect(isOnCooldown('test-action-unique-2', 5000)).toBe(true);
  });

  it('retorna false após o cooldown expirar', () => {
    vi.useFakeTimers();
    isOnCooldown('test-action-unique-3', 1000);
    vi.advanceTimersByTime(1001);
    expect(isOnCooldown('test-action-unique-3', 1000)).toBe(false);
    vi.useRealTimers();
  });
});
