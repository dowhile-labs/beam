export function isStdinTTY(): boolean {
  return Boolean(process.stdin.isTTY);
}

// Reads stdin to completion. Used both for piped input (`cat file | beam`)
// and interactive input (`beam` alone, typed then closed with Ctrl+D).
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
