import { describe, it, expect } from 'vitest';
import Index from '../src/pages/index.astro';

describe('Index Astro Component', () => {
  it('should import without crashing', () => {
    // This simple smoke test ensures the Astro file can be compiled and imported
    expect(Index).toBeDefined();
  });
});
