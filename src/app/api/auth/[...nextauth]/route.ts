/** Route handler de Auth.js (NL-201). Expone /api/auth/* (callback, signin, …). */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
