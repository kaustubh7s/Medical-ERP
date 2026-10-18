import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || '';

// Fallback dummy or active Neon client
export const sql = databaseUrl
  ? neon(databaseUrl)
  : ((() => {
      console.warn('DATABASE_URL environment variable is not defined.');
      return Promise.resolve([]);
    }) as any);
