import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);
