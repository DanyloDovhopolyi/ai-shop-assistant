"use client";

import { Button } from "@/shared/ui/button";

export default function CatalogError({
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">The catalog didn’t load</h1>
      <p className="text-sm text-muted-foreground">
        The product service didn’t answer. Load it again in a moment.
      </p>
      <Button type="button" onClick={retry}>
        Load again
      </Button>
    </main>
  );
}
