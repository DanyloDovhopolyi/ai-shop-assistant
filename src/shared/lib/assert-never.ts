/**
 * Exhaustiveness guard for discriminated unions.
 * Call it in the `default` branch: it only compiles when every variant is handled.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
