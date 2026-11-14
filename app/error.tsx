"use client";

export default function CatalogError({
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">We couldn’t load the catalog.</h1>
      <p className="text-sm text-zinc-500">
        The product service may be busy. Please try again.
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try again
      </button>
    </main>
  );
}
