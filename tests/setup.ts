/**
 * Setup global para Vitest.
 * - jest-dom matchers para @testing-library
 * - garantiza IA_PROVIDER=mock en todos los tests
 */
import '@testing-library/jest-dom/vitest';

process.env.IA_PROVIDER = 'mock';
