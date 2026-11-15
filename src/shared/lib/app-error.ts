/**
 * Base for expected, typed failures. Subclasses narrow `kind` to a string
 * literal so a union of them can be handled exhaustively with `switch (error.kind)`.
 */
export abstract class AppError extends Error {
  abstract readonly kind: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
