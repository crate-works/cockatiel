import { z } from 'zod';

// The CSP forbids eval; skip zod's `new Function` JIT probe instead of tripping it.
// Zod reads this when schemas are defined, so it must be imported before any of them.
z.config({ jitless: true });
