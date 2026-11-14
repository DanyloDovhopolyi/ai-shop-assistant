import { describe, expect, it } from "vitest";

import { assertNever } from "./assert-never";

type Shape = { kind: "circle" } | { kind: "square" };

function area(shape: Shape): string {
  switch (shape.kind) {
    case "circle":
      return "round";
    case "square":
      return "boxy";
    default:
      return assertNever(shape);
  }
}

describe("assertNever", () => {
  it("is unreachable when every variant is handled", () => {
    expect(area({ kind: "circle" })).toBe("round");
    expect(area({ kind: "square" })).toBe("boxy");
  });

  it("throws with the unhandled value when reached at runtime", () => {
    const leaked = { kind: "triangle" } as unknown as never;

    expect(() => assertNever(leaked)).toThrow(
      'Unhandled variant: {"kind":"triangle"}',
    );
  });

  it("rejects values that are not narrowed to never at compile time", () => {
    // @ts-expect-error a string is not `never`: the switch above would not compile with a missing case
    expect(() => assertNever("circle")).toThrow();
  });
});
