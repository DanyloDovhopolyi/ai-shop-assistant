import "server-only";

import { z } from "zod";

import { AppError } from "@/shared/lib";

const ServerEnvSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

/** Semantic search is optional: without these, only the search feature fails. */
const SupabaseEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof SupabaseEnvSchema>;

export class ConfigError extends AppError {
  readonly kind = "config";
}

/**
 * Validated server-only environment. Call it where a variable is needed, so a
 * missing secret fails that feature with a clear message instead of the build.
 */
export function getServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  return parseEnv(ServerEnvSchema, source);
}

export function getSupabaseEnv(
  source: Record<string, string | undefined> = process.env,
): SupabaseEnv {
  return parseEnv(SupabaseEnvSchema, source);
}

function parseEnv<T>(
  schema: z.ZodType<T>,
  source: Record<string, string | undefined>,
): T {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid server environment (see .env.example):\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
