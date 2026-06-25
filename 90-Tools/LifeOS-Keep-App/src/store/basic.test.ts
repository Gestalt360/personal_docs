/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Basic Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});