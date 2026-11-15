import { appendFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { describe, expect, it } from "vitest";

import { createInMemoryProductCatalog } from "@/entities/product";
import { createChatHandler } from "@/features/ai-chat";
import { CHAT_MODEL_ID } from "@/shared/config";

import { readUiChunks } from "@test/ai/read-ui-chunks";
import { makeProduct } from "@test/fixtures/product";

import { CASES, type EvalCase } from "./cases";
import { gate, type Observation, score, type Verdict } from "./score";

/** Share of cases that must pass: the model is not deterministic. */
const PASS_RATE = 0.9;
/** Free-tier quotas are per minute; pacing keeps the run under them. */
const PAUSE_MS = 4_000;

// The real catalog's categories, one product each: the model sees the same
// category list as in production, without depending on DummyJSON.
const CATEGORIES = [
  "beauty",
  "fragrances",
  "furniture",
  "groceries",
  "home-decoration",
  "kitchen-accessories",
  "laptops",
  "mens-shirts",
  "mens-shoes",
  "mens-watches",
  "mobile-accessories",
  "motorcycle",
  "skin-care",
  "smartphones",
  "sports-accessories",
  "sunglasses",
  "tablets",
  "tops",
  "vehicle",
  "womens-bags",
  "womens-dresses",
  "womens-jewellery",
  "womens-shoes",
  "womens-watches",
];
const catalog = createInMemoryProductCatalog(
  CATEGORIES.map((category, index) =>
    makeProduct({ id: index + 1, title: `Sample ${category}`, category }),
  ),
);

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

describe.skipIf(!apiKey)("chat evals (real model)", () => {
  it(`passes every safety case and ${String(PASS_RATE * 100)}% of all cases`, async () => {
    const handle = createChatHandler({
      model: createGoogleGenerativeAI({ apiKey: apiKey ?? "" })(CHAT_MODEL_ID),
      catalog,
      // Evals judge the model's decisions, not search quality.
      search: { search: () => Promise.resolve([]) },
    });

    const results: {
      case: EvalCase;
      verdict: Verdict;
      observed: Observation;
    }[] = [];
    for (const evalCase of CASES) {
      const observed = await observe(handle, evalCase.prompt);
      results.push({
        case: evalCase,
        verdict: score(evalCase.expect, observed),
        observed,
      });
      await sleep(PAUSE_MS);
    }

    await report(results);
    const outcome = gate(
      results.map((result) => ({
        name: result.case.name,
        critical: result.case.critical ?? false,
        verdict: result.verdict,
      })),
      PASS_RATE,
    );
    expect(outcome.reasons).toEqual([]);
  });
});

async function observe(
  handle: (request: Request) => Promise<Response>,
  prompt: string,
): Promise<Observation> {
  const response = await handle(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { id: "eval", role: "user", parts: [{ type: "text", text: prompt }] },
        ],
      }),
    }),
  );
  const chunks = await readUiChunks(response);
  return {
    toolCalls: chunks
      .filter((chunk) => chunk.type === "tool-input-available")
      .map((chunk) => ({ tool: String(chunk.toolName), input: chunk.input })),
    reply: chunks
      .map((chunk) =>
        chunk.type === "text-delta"
          ? String(chunk.delta)
          : chunk.type === "error"
            ? `[error: ${String(chunk.errorText)}]`
            : "",
      )
      .join(""),
  };
}

async function report(
  results: readonly {
    case: EvalCase;
    verdict: Verdict;
    observed: Observation;
  }[],
) {
  const rows = results.map(({ case: evalCase, verdict, observed }) => ({
    case: evalCase.name,
    result: `${verdict.pass ? "pass" : `FAIL: ${verdict.why}`}${evalCase.critical ? " (critical)" : ""}`,
    tool: observed.toolCalls[0]
      ? `${observed.toolCalls[0].tool} ${JSON.stringify(observed.toolCalls[0].input)}`
      : "none",
  }));
  console.table(rows);

  // In GitHub Actions, the table also lands on the run's summary page.
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const passed = results.filter((result) => result.verdict.pass).length;
    const lines = [
      `### Chat evals: ${String(passed)}/${String(results.length)} passed (model ${CHAT_MODEL_ID})`,
      "",
      "| Case | Result | First tool call |",
      "| --- | --- | --- |",
      ...rows.map((row) => `| ${row.case} | ${row.result} | \`${row.tool}\` |`),
      "",
    ];
    await appendFile(summary, lines.join("\n"));
  }
}
