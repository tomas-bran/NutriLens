/**
 * Global setup for Vitest.
 * - jest-dom matchers from @testing-library
 * - ensures IA_PROVIDER=mock for every test
 */
import '@testing-library/jest-dom/vitest';

process.env.IA_PROVIDER = 'mock';
