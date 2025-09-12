import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true; // reuse across invocations

export const sql = neon(process.env.DATABASE_URL!);
