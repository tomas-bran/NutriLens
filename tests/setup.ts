/**
 * Global setup for Vitest.
 * - jest-dom matchers from @testing-library
 * - ensures IA_PROVIDER=mock for every test
 * - stubs <SidebarUser> (server component que llama auth() → importa
 *   next-auth → next/server, que happy-dom no resuelve). Ningún test
 *   asercióna el footer del usuario, así que el stub no resta cobertura.
 */
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

process.env.IA_PROVIDER = 'mock';

vi.mock('@/components/layout/SidebarUser', () => ({
  SidebarUser: () => null,
}));
