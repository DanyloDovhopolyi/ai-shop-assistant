import { describe, expect, it } from "vitest";

import { ConfigError, getServerEnv } from "./env";

const valid = { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" };

describe("getServerEnv", () => {
  it("returns the validated server environment", () => {
    expect(getServerEnv(valid)).toEqual(valid);
  });

  it("drops variables the app does not declare", () => {
    expect(getServerEnv({ ...valid, UNRELATED: "x" })).toEqual(valid);
  });

  it.each([
    ["missing", {}],
    ["empty", { GOOGLE_GENERATIVE_AI_API_KEY: "" }],
  ])("names the variable when it is %s", (_case, source) => {
    const error = (() => {
      try {
        getServerEnv(source);
      } catch (e) {
        return e;
      }
    })();

    expect(error).toBeInstanceOf(ConfigError);
    expect(error).toMatchObject({ kind: "config" });
    expect((error as ConfigError).message).toContain(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    );
  });
});
