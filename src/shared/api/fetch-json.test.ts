import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { server } from "@test/msw/server";

import {
  AbortedError,
  HttpError,
  InvalidResponseError,
  NetworkError,
  TimeoutError,
} from "./errors";
import { fetchJson } from "./fetch-json";

const URL_ = "https://api.test/items";
const ItemSchema = z.object({ id: z.number(), title: z.string() });
const noDelay = () => 0;

/** Serves `responses` in order (the last one repeats) and counts hits. */
function serve(
  method: "get" | "post",
  ...responses: (() => Response | Promise<Response>)[]
) {
  const hits = { count: 0 };
  server.use(
    http[method](URL_, () => {
      const respond = responses[Math.min(hits.count, responses.length - 1)];
      hits.count += 1;
      if (respond === undefined)
        throw new Error("serve() needs at least one response");
      return respond();
    }),
  );
  return hits;
}

const ok = () => HttpResponse.json({ id: 1, title: "Phone" });
const status = (code: number) => () => new HttpResponse(null, { status: code });

describe("fetchJson", () => {
  it("returns the response parsed by the schema", async () => {
    serve("get", ok);

    await expect(fetchJson(URL_, ItemSchema)).resolves.toEqual({
      id: 1,
      title: "Phone",
    });
  });

  it("rejects a body that does not match the schema with readable issues", async () => {
    serve("get", () => HttpResponse.json({ id: "1" }));

    const error = await fetchJson(URL_, ItemSchema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InvalidResponseError);
    expect(error).toMatchObject({ kind: "invalid-response" });
    expect((error as InvalidResponseError).issues).toContain("id");
  });

  it("rejects a body that is not JSON", async () => {
    serve(
      "get",
      () =>
        new HttpResponse("<html>", {
          headers: { "Content-Type": "text/html" },
        }),
    );

    await expect(fetchJson(URL_, ItemSchema)).rejects.toBeInstanceOf(
      InvalidResponseError,
    );
  });

  it("does not retry client errors", async () => {
    const hits = serve("get", status(404));

    await expect(
      fetchJson(URL_, ItemSchema, { retryDelay: noDelay }),
    ).rejects.toMatchObject({
      kind: "http",
      status: 404,
    });
    expect(hits.count).toBe(1);
  });

  it.each([503, 429])("retries %i and recovers", async (code) => {
    const hits = serve("get", status(code), ok);

    await expect(
      fetchJson(URL_, ItemSchema, { retryDelay: noDelay }),
    ).resolves.toEqual({
      id: 1,
      title: "Phone",
    });
    expect(hits.count).toBe(2);
  });

  it("gives up after the retry budget with the last error", async () => {
    const hits = serve("get", status(503));

    const error = await fetchJson(URL_, ItemSchema, {
      retries: 2,
      retryDelay: noDelay,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 503 });
    expect(hits.count).toBe(3);
  });

  it("retries network failures", async () => {
    const hits = serve("get", () => HttpResponse.error(), ok);

    await expect(
      fetchJson(URL_, ItemSchema, { retryDelay: noDelay }),
    ).resolves.toMatchObject({
      id: 1,
    });
    expect(hits.count).toBe(2);
  });

  it("reports a network failure once retries run out", async () => {
    serve("get", () => HttpResponse.error());

    await expect(
      fetchJson(URL_, ItemSchema, { retries: 0, retryDelay: noDelay }),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it("times out a slow response", async () => {
    serve("get", async () => {
      await delay(500);
      return ok();
    });

    await expect(
      fetchJson(URL_, ItemSchema, { timeoutMs: 20, retries: 0 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it("stops without retrying when the caller aborts", async () => {
    const hits = serve("get", async () => {
      await delay(500);
      return ok();
    });
    const controller = new AbortController();

    const pending = fetchJson(URL_, ItemSchema, {
      signal: controller.signal,
      retryDelay: noDelay,
    });
    setTimeout(() => {
      controller.abort();
    }, 10);

    await expect(pending).rejects.toBeInstanceOf(AbortedError);
    expect(hits.count).toBe(1);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const hits = serve("get", ok);

    await expect(
      fetchJson(URL_, ItemSchema, { signal: AbortSignal.abort() }),
    ).rejects.toBeInstanceOf(AbortedError);
    expect(hits.count).toBe(0);
  });

  it("stops waiting between retries when the caller aborts", async () => {
    const hits = serve("get", status(503));
    const controller = new AbortController();

    const pending = fetchJson(URL_, ItemSchema, {
      signal: controller.signal,
      retryDelay: () => 10_000,
    });
    setTimeout(() => {
      controller.abort();
    }, 20);

    await expect(pending).rejects.toBeInstanceOf(AbortedError);
    expect(hits.count).toBe(1);
  });

  it("does not retry non-idempotent requests", async () => {
    const hits = serve("post", status(503));

    await expect(
      fetchJson(URL_, ItemSchema, {
        init: { method: "POST" },
        retryDelay: noDelay,
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(hits.count).toBe(1);
  });
});
