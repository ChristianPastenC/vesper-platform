/// <reference types="vitest" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  // @ts-ignore
  test: {
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx,js,jsx}'],
  },
});
