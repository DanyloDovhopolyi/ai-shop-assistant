/** Parses a UI message stream response (server-sent events) into its JSON chunks. */
export async function readUiChunks(
  response: Response,
): Promise<Record<string, unknown>[]> {
  const body = await response.text();
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: ") && line !== "data: [DONE]")
    .map(
      (line) =>
        JSON.parse(line.slice("data: ".length)) as Record<string, unknown>,
    );
}
