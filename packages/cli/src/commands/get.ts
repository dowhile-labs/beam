import type { BeamClient } from "../lib/api-client";
import { printGetSuccess, printJson } from "../lib/output";
import { EXIT_CODES } from "../exit-codes";

export interface GetOptions {
  json: boolean;
}

export async function runGet(
  id: string,
  client: BeamClient,
  options: GetOptions,
): Promise<number> {
  const result = await client.get(id);

  if (options.json) {
    printJson({ id, ...result });
    return EXIT_CODES.SUCCESS;
  }

  printGetSuccess(result);
  return EXIT_CODES.SUCCESS;
}
