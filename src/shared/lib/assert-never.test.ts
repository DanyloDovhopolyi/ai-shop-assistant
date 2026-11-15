import { expect, it } from "vitest";

import { assertNever } from "./assert-never";

it("accepts only narrowed values at compile time and throws if one leaks at runtime", () => {
  // @ts-expect-error a value not narrowed to `never` means a switch is missing a case
  expect(() => assertNever("circle")).toThrow('Unhandled variant: "circle"');
});
