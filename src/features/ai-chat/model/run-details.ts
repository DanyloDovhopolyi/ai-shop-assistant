import { z } from "zod";

/**
 * Facts about one answer, sent by the server as message metadata: which model
 * ran, how long the whole answer took, and how many tokens it used.
 */
export const ChatMetadataSchema = z.object({
  model: z.string().min(1).optional(),
  durationMs: z.number().nonnegative().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  finishReason: z.string().optional(),
});
export type ChatMetadata = z.infer<typeof ChatMetadataSchema>;

/** The parts of a message this module reads; structural, so it needs no SDK types. */
interface PartLike {
  readonly type: string;
  readonly state?: string;
  readonly input?: unknown;
}

export interface ToolRun {
  readonly name: string;
  readonly input: unknown;
  readonly ok: boolean;
}

export interface RunDetails {
  readonly tools: readonly ToolRun[];
  readonly steps: number;
  readonly model?: string;
  readonly durationMs?: number;
  readonly tokens?: {
    readonly input: number;
    readonly output: number;
    readonly total: number;
  };
}

const TOOL_PREFIX = "tool-";

/** What the "Under the hood" panel shows for one assistant message. */
export function describeRun({
  metadata,
  parts,
}: {
  readonly metadata?: ChatMetadata | undefined;
  readonly parts: readonly PartLike[];
}): RunDetails {
  const tools = parts
    .filter((part) => part.type.startsWith(TOOL_PREFIX))
    .map((part) => ({
      name: part.type.slice(TOOL_PREFIX.length),
      input: part.input,
      ok: part.state === "output-available",
    }));
  const { model, durationMs, inputTokens, outputTokens } = metadata ?? {};

  return {
    tools,
    steps: parts.filter((part) => part.type === "step-start").length,
    ...(model === undefined ? {} : { model }),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(inputTokens === undefined || outputTokens === undefined
      ? {}
      : {
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
          },
        }),
  };
}
